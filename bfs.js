app.post('/degree-of-separation', async (req, res) => {
  const { source_id, target_id } = req.body;
  if (!source_id || !target_id || source_id === target_id) {
    return res.status(400).json({ error: 'Invalid source or target IDs' });
  }

  // Check if both users exist
  const userCheck = await db.query(
    'SELECT id FROM Users WHERE id = $1 OR id = $2',
    [source_id, target_id]
  );
  if (userCheck.rowCount < 2) {
    return res.status(404).json({ error: 'One or both users not found' });
  }

  // Build adjacency list from all connections
  const connections = await db.query('SELECT user_id_1, user_id_2 FROM Connections');
  const graph = new Map();

  connections.rows.forEach(({ user_id_1, user_id_2 }) => {
    if (!graph.has(user_id_1)) graph.set(user_id_1, []);
    if (!graph.has(user_id_2)) graph.set(user_id_2, []);
    graph.get(user_id_1).push(user_id_2);
    graph.get(user_id_2).push(user_id_1);
  });

  // BFS
  const visited = new Set();
  const queue = [[source_id, 0]];

  while (queue.length > 0) {
    const [current, degree] = queue.shift();
    if (current === target_id) {
      return res.json({ degree });
    }

    if (!visited.has(current)) {
      visited.add(current);
      const neighbors = graph.get(current) || [];
      neighbors.forEach(neighbor => {
        if (!visited.has(neighbor)) {
          queue.push([neighbor, degree + 1]);
        }
      });
    }
  }

  return res.status(404).json({ error: 'No connection path found' });
});
