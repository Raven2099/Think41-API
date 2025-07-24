
// SECOND DEGREE FRIENDS

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
