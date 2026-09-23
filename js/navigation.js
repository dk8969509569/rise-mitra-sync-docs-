class TrieNode {
  constructor() {
    this.children = new Map();
    this.isEndOfWord = false;
    this.records = [];
  }
}
class RMTrieSearch {
  constructor() { this.root = new TrieNode(); }
  _normalize(text) { return !text ? "" : text.toString().toLowerCase().trim(); }
  insert(keyword, itemRecord) {
    const term = this._normalize(keyword);
    if (!term) return;
    let node = this.root;
    for (const char of term) {
      if (!node.children.has(char)) node.children.set(char, new TrieNode());
      node = node.children.get(char);
    }
    node.isEndOfWord = true;
    if (!node.records.some(r => r.id === itemRecord.id)) node.records.push(itemRecord);
  }
  _collectAll(node, resultSet) {
    if (!node) return;
    if (node.isEndOfWord) node.records.forEach(r => resultSet.add(r));
    for (const child of node.children.values()) this._collectAll(child, resultSet);
  }
  search(prefix) {
    const term = this._normalize(prefix);
    if (!term) return [];
    let node = this.root;
    for (const char of term) {
      if (!node.children.has(char)) return [];
      node = node.children.get(char);
    }
    const resultSet = new Set();
    this._collectAll(node, resultSet);
    return Array.from(resultSet);
  }
}
if (typeof window !== 'undefined') {
  window.RMTrieSearch = RMTrieSearch;
  window.rmSearchEngine = new RMTrieSearch();
}
