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




