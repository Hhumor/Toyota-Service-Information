(function() {
    'use strict';

    const TOC_URL = 'control/toc.xml';
    const CONTENTS_BASE_URL = 'contents/';
    let treeItems = new Map();

    function loadXMLDoc(url) {
        return new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            xhr.onreadystatechange = function() {
                if (xhr.readyState === 4) {
                    if (xhr.status === 200) {
                        try {
                            const parser = new DOMParser();
                            const xmlDoc = parser.parseFromString(xhr.responseText, 'text/xml');
                            resolve(xmlDoc);
                        } catch (e) {
                            reject(new Error('XML解析失败: ' + e.message));
                        }
                    } else {
                        reject(new Error('加载XML失败: ' + xhr.status));
                    }
                }
            };
            xhr.open('GET', url, true);
            xhr.send();
        });
    }

    function createTreeItem(name, id, type, children = []) {
        const item = {
            name: name,
            id: id,
            type: type,
            children: children,
            hasChildren: children.length > 0
        };
        return item;
    }

    function parseTOC(xmlDoc) {
        const root = xmlDoc.querySelector('tmc-service-toc');
        if (!root) {
            throw new Error('无效的TOC格式');
        }

        const pub = root.querySelector('pub');
        if (!pub) {
            throw new Error('找不到pub元素');
        }

        const treeData = [];

        const servcats = pub.querySelectorAll('servcat');
        servcats.forEach(servcat => {
            const servcatName = servcat.querySelector('name')?.textContent || '未命名分类';
            const servcatId = servcat.getAttribute('id') || '';

            const servcatChildren = [];

            const sections = servcat.querySelectorAll('section');
            sections.forEach(section => {
                const sectionName = section.querySelector('name')?.textContent || '未命名章节';
                const sectionId = section.getAttribute('id') || '';

                const sectionChildren = [];

                const ttls = section.querySelectorAll('ttl');
                ttls.forEach(ttl => {
                    const ttlName = ttl.querySelector('name')?.textContent || '未命名标题';
                    const ttlId = ttl.getAttribute('id') || '';

                    const ttlChildren = [];

                    const paras = ttl.querySelectorAll('para');
                    paras.forEach(para => {
                        const paraName = para.querySelector('name')?.textContent || '未命名';
                        const paraId = para.getAttribute('id') || '';

                        if (paraId) {
                            ttlChildren.push(createTreeItem(paraName, paraId, 'para'));
                        }
                    });

                    if (ttlChildren.length > 0 || ttlName) {
                        sectionChildren.push(createTreeItem(ttlName, ttlId, 'ttl', ttlChildren));
                    }
                });

                if (sectionChildren.length > 0 || sectionName) {
                    servcatChildren.push(createTreeItem(sectionName, sectionId, 'section', sectionChildren));
                }
            });

            if (servcatChildren.length > 0 || servcatName) {
                treeData.push(createTreeItem(servcatName, servcatId, 'servcat', servcatChildren));
            }
        });

        return treeData;
    }

    function renderTree(data, container, level = 0) {
        const ul = document.createElement('ul');
        ul.className = 'tree';
        if (level > 0) {
            ul.style.display = 'none';
            ul.className += ' tree-children';
        }

        data.forEach(item => {
            const li = document.createElement('li');
            
            const treeItem = document.createElement('div');
            treeItem.className = 'tree-item';
            treeItem.dataset.id = item.id;
            treeItem.dataset.type = item.type;

            treeItems.set(item.id, {
                element: treeItem,
                item: item,
                level: level
            });

            const toggle = document.createElement('span');
            toggle.className = 'tree-toggle';
            if (item.hasChildren) {
                toggle.textContent = '▶';
            } else {
                toggle.className += ' invisible';
                toggle.textContent = '▶';
            }

            const icon = document.createElement('span');
            icon.className = 'tree-icon';
            switch (item.type) {
                case 'servcat':
                    icon.textContent = '📁';
                    break;
                case 'section':
                    icon.textContent = '📂';
                    break;
                case 'ttl':
                    icon.textContent = '📄';
                    break;
                case 'para':
                    icon.textContent = '📝';
                    break;
                default:
                    icon.textContent = '•';
            }

            const text = document.createElement('span');
            text.className = 'tree-text';
            text.textContent = item.name;

            treeItem.appendChild(toggle);
            treeItem.appendChild(icon);
            treeItem.appendChild(text);
            li.appendChild(treeItem);

            let childrenContainer = null;
            if (item.hasChildren) {
                childrenContainer = renderTree(item.children, container, level + 1);
                li.appendChild(childrenContainer);
            }

            if (item.type === 'para') {
                treeItem.addEventListener('click', function(e) {
                    e.stopPropagation();
                    
                    document.querySelectorAll('.tree-item.active').forEach(el => {
                        el.classList.remove('active');
                    });
                    treeItem.classList.add('active');

                    const contentUrl = CONTENTS_BASE_URL + item.id + '.html';
                    const iframe = document.getElementById('content-frame');
                    if (iframe) {
                        iframe.src = contentUrl;
                    }

                    history.pushState(null, null, '#' + item.id);
                });
            } else if (item.hasChildren) {
                treeItem.addEventListener('click', function(e) {
                    e.stopPropagation();
                    const isExpanded = toggle.classList.contains('expanded');
                    if (isExpanded) {
                        toggle.classList.remove('expanded');
                        childrenContainer.classList.remove('expanded');
                        childrenContainer.style.display = 'none';
                    } else {
                        toggle.classList.add('expanded');
                        childrenContainer.classList.add('expanded');
                        childrenContainer.style.display = 'block';
                    }
                });

                toggle.addEventListener('click', function(e) {
                    e.stopPropagation();
                    treeItem.click();
                });
            }

            ul.appendChild(li);
        });

        return ul;
    }

    function expandFirstLevel(container) {
    }

    function expandToItem(itemId) {
        const itemData = treeItems.get(itemId);
        if (!itemData) return;

        const { element, item, level } = itemData;

        collapseAllExcept(itemId);

        let parent = element.parentElement;
        while (parent) {
            if (parent.classList.contains('tree-children')) {
                parent.style.display = 'block';
                const parentLi = parent.parentElement;
                if (parentLi) {
                    const toggle = parentLi.querySelector('.tree-toggle');
                    if (toggle && !toggle.classList.contains('expanded')) {
                        toggle.classList.add('expanded');
                    }
                }
            }
            parent = parent.parentElement;
        }

        if (item.type === 'para') {
            document.querySelectorAll('.tree-item.active').forEach(el => {
                el.classList.remove('active');
            });
            element.classList.add('active');

            const contentUrl = CONTENTS_BASE_URL + item.id + '.html';
            const iframe = document.getElementById('content-frame');
            if (iframe) {
                iframe.src = contentUrl;
            }
        }

        setTimeout(() => {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 100);
    }

    function collapseAllExcept(exceptItemId) {
        treeItems.forEach((data, id) => {
            if (id === exceptItemId) return;

            const { element, item } = data;
            const childrenContainer = element.parentElement.querySelector('.tree-children');
            if (childrenContainer) {
                childrenContainer.style.display = 'none';
                const toggle = element.querySelector('.tree-toggle');
                if (toggle) {
                    toggle.classList.remove('expanded');
                }
            }
        });
    }

    function handleHashChange() {
        const hash = window.location.hash.substring(1);
        if (hash) {
            expandToItem(hash);
        }
    }

    function searchNodes(keyword) {
        const results = [];
        const maxResults = 20;

        if (!keyword || keyword.trim() === '') {
            return results;
        }

        const lowerKeyword = keyword.toLowerCase().trim();

        treeItems.forEach((data, id) => {
            if (results.length >= maxResults) return;

            const { item, element } = data;
            const lowerName = item.name.toLowerCase();

            if (lowerName.includes(lowerKeyword)) {
                let path = [];
                let parent = element.parentElement;
                let depth = 0;
                while (parent && depth < 3) {
                    const parentLi = parent.closest('li');
                    if (!parentLi) break;
                    
                    const grandParent = parentLi.parentElement;
                    if (!grandParent) break;
                    
                    const grandParentLi = grandParent.closest('li');
                    if (!grandParentLi) break;
                    
                    const parentItem = grandParentLi.querySelector('.tree-item');
                    if (parentItem) {
                        const parentId = parentItem.dataset.id;
                        const parentData = treeItems.get(parentId);
                        if (parentData) {
                            path.unshift(parentData.item.name);
                            depth++;
                        }
                    }
                    parent = grandParent;
                }

                results.push({
                    id: item.id,
                    name: item.name,
                    type: item.type,
                    path: path.length > 0 ? path.join(' > ') : item.name
                });
            }
        });

        return results;
    }

    function displaySearchResults(results) {
        const searchResults = document.getElementById('search-results');
        if (!searchResults) return;

        searchResults.innerHTML = '';

        if (results.length === 0) {
            const emptyDiv = document.createElement('div');
            emptyDiv.className = 'search-results-empty';
            emptyDiv.textContent = '未找到匹配结果';
            searchResults.appendChild(emptyDiv);
            return;
        }

        results.forEach(result => {
            const resultItem = document.createElement('div');
            resultItem.className = 'search-result-item';
            resultItem.dataset.id = result.id;

            const pathDiv = document.createElement('div');
            pathDiv.className = 'result-path';
            pathDiv.textContent = result.path;

            const nameDiv = document.createElement('div');
            nameDiv.className = 'result-name';
            nameDiv.textContent = result.name;

            resultItem.appendChild(pathDiv);
            resultItem.appendChild(nameDiv);

            resultItem.addEventListener('click', function() {
                expandToItem(result.id);
                history.pushState(null, null, '#' + result.id);
                searchResults.classList.add('hidden');
                document.getElementById('search-input').value = '';
            });

            searchResults.appendChild(resultItem);
        });
    }

    function initSearch() {
        const searchInput = document.getElementById('search-input');
        const searchResults = document.getElementById('search-results');
        const searchClear = document.getElementById('search-clear');

        if (!searchInput || !searchResults || !searchClear) return;

        let searchTimeout;

        searchInput.addEventListener('input', function() {
            clearTimeout(searchTimeout);
            const keyword = this.value;

            if (keyword.trim() === '') {
                searchClear.classList.add('hidden');
                searchResults.classList.add('hidden');
                return;
            } else {
                searchClear.classList.remove('hidden');
            }

            searchTimeout = setTimeout(() => {
                const results = searchNodes(keyword);
                displaySearchResults(results);
                searchResults.classList.remove('hidden');
            }, 300);
        });

        searchInput.addEventListener('focus', function() {
            if (this.value.trim() !== '') {
                searchResults.classList.remove('hidden');
            }
        });

        searchClear.addEventListener('click', function() {
            searchInput.value = '';
            searchClear.classList.add('hidden');
            searchResults.classList.add('hidden');
            searchInput.focus();
        });

        document.addEventListener('click', function(e) {
            if (!e.target.closest('#search-container')) {
                searchResults.classList.add('hidden');
            }
        });
    }

    function init() {
        const treeContainer = document.getElementById('tree-container');
        const loading = document.getElementById('loading');

        if (!treeContainer) {
            console.error('找不到tree-container元素');
            return;
        }

        loadXMLDoc(TOC_URL)
            .then(xmlDoc => {
                const treeData = parseTOC(xmlDoc);
                
                treeContainer.innerHTML = '';
                const tree = renderTree(treeData, treeContainer);
                treeContainer.appendChild(tree);

                expandFirstLevel(treeContainer);

                handleHashChange();
                initSearch();
            })
            .catch(error => {
                console.error('加载目录失败:', error);
                if (loading) {
                    loading.textContent = '加载目录失败: ' + error.message;
                    loading.style.color = '#dc2626';
                }
            });

        window.addEventListener('hashchange', handleHashChange);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();