(function() {
    'use strict';

    const TOC_URL = 'control/toc.xml';
    const CONTENTS_BASE_URL = 'contents/';

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
                            const ncfPara = para.querySelector('ncf-para');
                            const ncfParaName = ncfPara?.querySelector('name')?.textContent || '';
                            
                            const displayName = ncfParaName ? `${paraName} - ${ncfParaName}` : paraName;
                            
                            ttlChildren.push(createTreeItem(displayName, paraId, 'para'));
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
        const firstLevelToggles = container.querySelectorAll('.tree-item[data-type="servcat"] .tree-toggle');
        firstLevelToggles.forEach(toggle => {
            if (!toggle.classList.contains('invisible')) {
                toggle.click();
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
            })
            .catch(error => {
                console.error('加载目录失败:', error);
                if (loading) {
                    loading.textContent = '加载目录失败: ' + error.message;
                    loading.style.color = '#dc2626';
                }
            });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();