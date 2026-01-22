import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppGuestSession";
import type { ITodoAppAccessToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAccessToken";
import type { ITodoAppGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppGuest";
import type { ITodoAppGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppGuestSession";
import { prepare_random_todo_app_guest_session } from "../../../prepare/prepare_random_todo_app_guest_session";
import { generate_random_todo_app_guests_sessions_create } from "../../../generate/generate_random_todo_app_guests_sessions_create";
import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";
export async function test_api_guest_session_filtered_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authorize guest user join and create guest-specific connection
  const guestConnection: api.IConnection = { host: connection.host };
  const guest = await authorize_guest_join(guestConnection, {
    body: { guestIdentifier: RandomGenerator.alphaNumeric(16) },
  });
  guestConnection.headers = { Authorization: guest.token.access };
  // Step 2: Create multiple guest sessions for the guest
  const startDate = new Date();
  const createDateTimes = [0, 1, 2, 3].map(
    (i) => new Date(startDate.getTime() + i * 1000 * 60),
  );
  const expireDateTimes = [10, 11, 12, 13].map(
    (i) => new Date(startDate.getTime() + i * 1000 * 60),
  );
  const sessions = await Promise.all(
    createDateTimes.map(async (_createdAt, idx) => {
      const expiresAt = expireDateTimes[idx];
      return await generate_random_todo_app_guests_sessions_create(
        guestConnection,
        {
          params: { guestId: guest.id },
          body: {
            accessToken: RandomGenerator.alphaNumeric(32),
            refreshToken: RandomGenerator.alphaNumeric(32),
            ip: `192.168.1.${idx + 1}`,
            userAgent: "Mozilla/5.0 (compatible; TestBot/1.0)",
            deviceInfo: `Device-${idx + 1}`,
            expiresAt: expiresAt.toISOString(),
          },
        },
      );
    }),
  );
  // Step 3: Filter sessions with pagination and date range
  const createdAfter = new Date(
    createDateTimes[0].getTime() + 1000,
  ).toISOString();
  const createdBefore = new Date(
    createDateTimes[3].getTime() - 1000,
  ).toISOString();
  const filterBody = {
    page: 1,
    limit: 3,
    sortBy: "created_at",
    sortOrder: "desc",
    createdAfter,
    createdBefore,
  } satisfies ITodoAppGuestSession.IRequest;
  const filteredSessions =
    await api.functional.todoApp.guest.guests.sessions.index(guestConnection, {
      guestId: guest.id,
      body: filterBody,
    });
  // Validate pagination info
  TestValidator.predicate(
    "page current is 1",
    filteredSessions.pagination.current === 1,
  );
  TestValidator.predicate(
    "page limit is 3",
    filteredSessions.pagination.limit === 3,
  );
  TestValidator.predicate(
    "page records equals or less than total",
    filteredSessions.pagination.records >= filteredSessions.data.length,
  );
  // Validate sessions are sorted descending by created_at
  for (let i = 0; i + 1 < filteredSessions.data.length; i++) {
    const lhs = new Date(filteredSessions.data[i].created_at);
    const rhs = new Date(filteredSessions.data[i + 1].created_at);
    TestValidator.predicate(
      `session[${i}] created at >= session[${i + 1}] created at`,
      lhs.getTime() >= rhs.getTime(),
    );
  }
  // Validate createdAt filter boundaries
  for (const session of filteredSessions.data) {
    TestValidator.predicate(
      "session createdAt > createdAfter",
      new Date(session.created_at) > new Date(createdAfter),
    );
    TestValidator.predicate(
      "session createdAt < createdBefore",
      new Date(session.created_at) < new Date(createdBefore),
    );
  }
  // Validate sessions belong to the correct guest
  for (const session of filteredSessions.data) {
    TestValidator.equals(
      "session guest_id matches guest id",
      session.guest_id,
      guest.id,
    );
  }
  // Step 4: Create another guest and a session, verify isolation
  const otherGuestConnection: api.IConnection = { host: connection.host };
  const otherGuest = await authorize_guest_join(otherGuestConnection, {
    body: { guestIdentifier: RandomGenerator.alphaNumeric(16) },
  });
  otherGuestConnection.headers = { Authorization: otherGuest.token.access };
  const otherSession = await generate_random_todo_app_guests_sessions_create(
    otherGuestConnection,
    {
      params: { guestId: otherGuest.id },
      body: {
        accessToken: RandomGenerator.alphaNumeric(32),
        refreshToken: RandomGenerator.alphaNumeric(32),
        ip: "192.168.99.99",
        userAgent: "Mozilla/5.0 (compatible; OtherTestBot/1.0)",
        deviceInfo: "OtherDevice",
        expiresAt: new Date(Date.now() + 3600000).toISOString(),
      },
    },
  );
  // Step 5: Retrieve all sessions for original guest
  const allGuestSessions =
    await api.functional.todoApp.guest.guests.sessions.index(guestConnection, {
      guestId: guest.id,
      body: {
        page: 1,
        limit: 50,
      },
    });
  // Verify no session belongs to the other guest
  for (const session of allGuestSessions.data) {
    TestValidator.predicate(
      "no session from other guest",
      session.guest_id !== otherGuest.id,
    );
  }
}
