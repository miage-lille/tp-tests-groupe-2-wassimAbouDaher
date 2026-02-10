import supertest from 'supertest';
import { TestServerFixture } from 'src/tests/fixtures';

describe('Webinar Routes E2E', () => {
  let fixture: TestServerFixture;

  beforeAll(async () => {
    fixture = new TestServerFixture();
    await fixture.init();
  });

  beforeEach(async () => {
    await fixture.reset();
  });

  afterAll(async () => {
    await fixture.stop();
  });

  it('should update webinar seats', async () => {
    // ARRANGE
    const prisma = fixture.getPrismaClient();
    const server = fixture.getServer();

    const webinar = await prisma.webinar.create({
      data: {
        id: 'test-webinar',
        title: 'Webinar Test',
        seats: 10,
        startDate: new Date(),
        endDate: new Date(),
        organizerId: 'test-user',
      },
    });

    // ACT
    const response = await supertest(server)
      .post(`/webinars/${webinar.id}/seats`)
      .send({ seats: '30' })
      .expect(200);

    // ASSERT
    expect(response.body).toEqual({ message: 'Seats updated' });

    const updatedWebinar = await prisma.webinar.findUnique({
      where: { id: webinar.id },
    });
    expect(updatedWebinar?.seats).toBe(30);
  });

  it('should return 404 if webinar not found', async () => {
    // ARRANGE
    const server = fixture.getServer();

    // ACT
    const response = await supertest(server)
      .post(`/webinars/non-existent-id/seats`)
      .send({ seats: '30' })
      .expect(404);

    // ASSERT
    expect(response.body).toEqual({ error: 'Webinar not found' });
  });

  it('should return 401 if user is not organizer', async () => {
    // ARRANGE
    const prisma = fixture.getPrismaClient();
    const server = fixture.getServer();

    const webinar = await prisma.webinar.create({
      data: {
        id: 'test-webinar-not-organizer',
        title: 'Webinar Test',
        seats: 10,
        startDate: new Date(),
        endDate: new Date(),
        organizerId: 'other-user',
      },
    });

    // ACT
    const response = await supertest(server)
      .post(`/webinars/${webinar.id}/seats`)
      .send({ seats: '30' })
      .expect(401);

    // ASSERT
    expect(response.body).toEqual({ error: 'User is not allowed to update this webinar' });
  });

  it('should organize a webinar', async () => {
    // ARRANGE
    const server = fixture.getServer();
    const prisma = fixture.getPrismaClient();

    // ACT
    const response = await supertest(server)
      .post('/webinars')
      .send({
        title: 'New Webinar',
        seats: 50,
        startDate: '2050-01-01T00:00:00Z',
        endDate: '2050-01-01T01:00:00Z',
      })
      .expect(201);

    // ASSERT
    expect(response.body).toEqual({ id: expect.any(String) });

    const createdWebinar = await prisma.webinar.findUnique({
      where: { id: response.body.id },
    });
    expect(createdWebinar).toBeDefined();
    expect(createdWebinar?.title).toBe('New Webinar');
  });
});
