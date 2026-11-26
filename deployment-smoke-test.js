export default {
  async fetch() {
    return Response.json({ service: 'partshub-deployment-smoke-test', status: 'ok', database_connected: false });
  }
};
