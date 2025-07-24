# Think41-API
API handling questions for Think41


// DELETE /connections
app.delete('/connections', async (req, res) => {
  const { user_id_1, user_id_2 } = req.body;

  if (!user_id_1 || !user_id_2 || user_id_1 === user_id_2) {
    return res.status(400).json({ error: 'Invalid user IDs' });
  }

  const [id1, id2] = user_id_1 < user_id_2 ? [user_id_1, user_id_2] : [user_id_2, user_id_1];

  const result = await db.query(
    'DELETE FROM Connections WHERE user_id_1 = $1 AND user_id_2 = $2 RETURNING *',
    [id1, id2]
  );

  if (result.rowCount === 0) {
    return res.status(404).json({ error: 'Connection not found' });
  }

  return res.json({ message: 'Connection removed successfully' });
});

app.get('/friends-of-friends/:userId', async (req, res) => {
  const userId = parseInt(req.params.userId);

  if (!userId) return res.status(400).json({ error: 'Invalid userId' });

  // Check user exists
  const userCheck = await db.query('SELECT id FROM Users WHERE id = $1', [userId]);
  if (userCheck.rowCount === 0) return res.status(404).json({ error: 'User not found' });

  const query = `
    WITH DirectFriends AS (
      SELECT CASE
               WHEN user_id_1 = $1 THEN user_id_2
               ELSE user_id_1
             END AS friend_id
      FROM Connections
      WHERE user_id_1 = $1 OR user_id_2 = $1
    ),
    SecondDegree AS (
      SELECT CASE
               WHEN c.user_id_1 = df.friend_id THEN c.user_id_2
               ELSE c.user_id_1
             END AS second_friend_id
      FROM Connections c
      JOIN DirectFriends df ON c.user_id_1 = df.friend_id OR c.user_id_2 = df.friend_id
    )
    SELECT u.id, u.name
    FROM SecondDegree sd
    JOIN Users u ON u.id = sd.second_friend_id
    WHERE sd.second_friend_id != $1
      AND sd.second_friend_id NOT IN (SELECT friend_id FROM DirectFriends)
    GROUP BY u.id, u.name;
  `;

  const result = await db.query(query, [userId]);
  res.json(result.rows);
});

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


