import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppMemberSession";
import type { ITodoAppGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppGuest";
import type { ITodoAppGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppGuestSession";
import type { ITodoAppMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_guest_session_expiration_filtering(
  connection: api.IConnection,
): Promise<void> {
  // 1. Guest authentication
  const guestConnection: api.IConnection = { host: connection.host };
  const guest = await authorize_guest_join(guestConnection, {
    body: {
      device_fingerprint: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ITodoAppGuest.IJoin,
  });
  typia.assert(guest);
  // 2. Test filtering by expired_at_from (sessions expiring after timestamp)
  const now = new Date();
  const futureDate = new Date(now.getTime() + 1000 * 60 * 60 * 24 * 30); // 30 days from now
  const pastDate = new Date(now.getTime() - 1000 * 60 * 60 * 24 * 30); // 30 days ago
  const expiredAtFromResult = await api.functional.todoApp.guest.sessions.index(
    guestConnection,
    {
      body: {
        expired_at_from: futureDate.toISOString(),
      } satisfies ITodoAppMemberSession.IRequest,
    },
  );
  typia.assert(expiredAtFromResult);
  TestValidator.predicate(
    "expired_at_from filter returns paginated result",
    expiredAtFromResult.pagination.current >= 1,
  );
  expiredAtFromResult.data.forEach((session) => {
    TestValidator.predicate(
      `session ${session.id} expires after from date`,
      new Date(session.expired_at) >= futureDate,
    );
  });
  // 3. Test filtering by expired_at_to (sessions expiring before timestamp)
  const expiredAtToResult = await api.functional.todoApp.guest.sessions.index(
    guestConnection,
    {
      body: {
        expired_at_to: futureDate.toISOString(),
      } satisfies ITodoAppMemberSession.IRequest,
    },
  );
  typia.assert(expiredAtToResult);
  TestValidator.predicate(
    "expired_at_to filter returns paginated result",
    expiredAtToResult.pagination.current >= 1,
  );
  expiredAtToResult.data.forEach((session) => {
    TestValidator.predicate(
      `session ${session.id} expires before to date`,
      new Date(session.expired_at) <= futureDate,
    );
  });
  // 4. Test filtering by created_at_from and created_at_to (creation date range)
  const createdAtRangeResult =
    await api.functional.todoApp.guest.sessions.index(guestConnection, {
      body: {
        created_at_from: pastDate.toISOString(),
        created_at_to: now.toISOString(),
      } satisfies ITodoAppMemberSession.IRequest,
    });
  typia.assert(createdAtRangeResult);
  TestValidator.predicate(
    "created_at range filter returns paginated result",
    createdAtRangeResult.pagination.current >= 1,
  );
  createdAtRangeResult.data.forEach((session) => {
    const createdAt = new Date(session.created_at);
    TestValidator.predicate(
      `session ${session.id} created within range`,
      createdAt >= pastDate && createdAt <= now,
    );
  });
  // 5. Test active vs expired session distinction
  const allSessionsResult = await api.functional.todoApp.guest.sessions.index(
    guestConnection,
    {
      body: {} satisfies ITodoAppMemberSession.IRequest,
    },
  );
  typia.assert(allSessionsResult);
  allSessionsResult.data.forEach((session) => {
    const isExpired = new Date(session.expired_at) < now;
    TestValidator.equals(
      `session ${session.id} isExpired flag matches calculation`,
      session.isExpired,
      isExpired,
    );
  });
  // 6. Test combined filters (expired_at_from + expired_at_to)
  const combinedResult = await api.functional.todoApp.guest.sessions.index(
    guestConnection,
    {
      body: {
        expired_at_from: pastDate.toISOString(),
        expired_at_to: futureDate.toISOString(),
      } satisfies ITodoAppMemberSession.IRequest,
    },
  );
  typia.assert(combinedResult);
  combinedResult.data.forEach((session) => {
    const expiredAt = new Date(session.expired_at);
    TestValidator.predicate(
      `session ${session.id} expires within combined range`,
      expiredAt >= pastDate && expiredAt <= futureDate,
    );
  });
  // 7. Test all filters combined
  const allFiltersResult = await api.functional.todoApp.guest.sessions.index(
    guestConnection,
    {
      body: {
        created_at_from: pastDate.toISOString(),
        created_at_to: now.toISOString(),
        expired_at_from: pastDate.toISOString(),
        expired_at_to: futureDate.toISOString(),
      } satisfies ITodoAppMemberSession.IRequest,
    },
  );
  typia.assert(allFiltersResult);
  allFiltersResult.data.forEach((session) => {
    const createdAt = new Date(session.created_at);
    const expiredAt = new Date(session.expired_at);
    TestValidator.predicate(
      `session ${session.id} matches all filters`,
      createdAt >= pastDate &&
        createdAt <= now &&
        expiredAt >= pastDate &&
        expiredAt <= futureDate,
    );
  });
}
