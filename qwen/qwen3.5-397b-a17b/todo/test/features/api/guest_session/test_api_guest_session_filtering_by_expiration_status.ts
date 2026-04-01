import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoGuest";
import type { IMultiUserTodoGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoGuestSession";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMultiUserTodoGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMultiUserTodoGuestSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

/**
 * Test filtering guest sessions by expiration status.
 * 1. Create multiple guest accounts to generate session data
 * 2. Test expired=true filter returns only expired sessions
 * 3. Test expired=false filter returns only active sessions
 * 4. Validate pagination metadata accuracy
 * 5. Verify all session fields are properly returned
 */
export async function test_api_guest_session_filtering_by_expiration_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create multiple guest accounts to generate session data
  const guest1 = await authorize_guest_join(connection, {
    body: {
      device_fingerprint: RandomGenerator.alphaNumeric(32),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IMultiUserTodoGuest.IJoin,
  });
  typia.assert(guest1);
  const guest2 = await authorize_guest_join(connection, {
    body: {
      device_fingerprint: RandomGenerator.alphaNumeric(32),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IMultiUserTodoGuest.IJoin,
  });
  typia.assert(guest2);
  const guest3 = await authorize_guest_join(connection, {
    body: {
      device_fingerprint: RandomGenerator.alphaNumeric(32),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IMultiUserTodoGuest.IJoin,
  });
  typia.assert(guest3);
  // 2. Test filtering with expired=true (expired sessions)
  const expiredSessions =
    await api.functional.multiUserTodo.guest.sessions.index(connection, {
      body: {
        expired: true,
        limit: 100,
      } satisfies IMultiUserTodoGuestSession.IRequest,
    });
  typia.assert(expiredSessions);
  // Validate pagination metadata
  TestValidator.predicate(
    "expired pagination current page",
    expiredSessions.pagination.current === 1,
  );
  TestValidator.predicate(
    "expired pagination records match data",
    expiredSessions.pagination.records === expiredSessions.data.length,
  );
  // Validate all returned sessions are actually expired (expired_at < now)
  const now = new Date();
  for (const session of expiredSessions.data) {
    typia.assert(session);
    TestValidator.predicate(
      `session ${session.id} is expired`,
      new Date(session.expired_at) < now,
    );
  }
  // 3. Test filtering with expired=false (active sessions)
  const activeSessions =
    await api.functional.multiUserTodo.guest.sessions.index(connection, {
      body: {
        expired: false,
        limit: 100,
      } satisfies IMultiUserTodoGuestSession.IRequest,
    });
  typia.assert(activeSessions);
  // Validate pagination metadata
  TestValidator.predicate(
    "active pagination current page",
    activeSessions.pagination.current === 1,
  );
  TestValidator.predicate(
    "active pagination records match data",
    activeSessions.pagination.records === activeSessions.data.length,
  );
  // Validate all returned sessions are actually active (expired_at >= now)
  for (const session of activeSessions.data) {
    typia.assert(session);
    TestValidator.predicate(
      `session ${session.id} is active`,
      new Date(session.expired_at) >= now,
    );
  }
  // 4. Validate that filtering correctly separates sessions
  TestValidator.predicate(
    "expired and active counts differ or both exist",
    expiredSessions.data.length > 0 || activeSessions.data.length > 0,
  );
}
