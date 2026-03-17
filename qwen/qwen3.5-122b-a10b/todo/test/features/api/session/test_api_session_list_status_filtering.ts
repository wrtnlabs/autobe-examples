import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoGuest";
import type { IMultiUserTodoMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoMember";
import type { IMultiUserTodoMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoMemberSession";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMultiUserTodoMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMultiUserTodoMemberSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_session_list_status_filtering(
  connection: api.IConnection,
): Promise<void> {
  // 1. Guest joins and creates initial session
  const guestConnection: api.IConnection = { host: connection.host };
  const auth = await authorize_guest_join(guestConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IMultiUserTodoGuest.IJoin,
  });
  typia.assert(auth);
  // 2. Test filtering by 'active' status
  const activeSessions =
    await api.functional.multiUserTodo.guest.sessions.index(guestConnection, {
      body: {
        status: "active",
        page: 1,
        limit: 10,
      } satisfies IMultiUserTodoMemberSession.IRequest,
    });
  typia.assert(activeSessions);
  // Validate active sessions have correct status indicators
  TestValidator.predicate(
    "active sessions have null deleted_at",
    activeSessions.data.every((s) => s.deleted_at === null),
  );
  TestValidator.predicate(
    "active sessions have future expired_at",
    activeSessions.data.every((s) => new Date(s.expired_at) > new Date()),
  );
  // Validate pagination metadata
  TestValidator.equals(
    "active pagination current page",
    activeSessions.pagination.current,
    1,
  );
  TestValidator.predicate(
    "active pagination limit is positive",
    activeSessions.pagination.limit > 0,
  );
  TestValidator.predicate(
    "active pagination records matches data length",
    activeSessions.pagination.records === activeSessions.data.length,
  );
  // 3. Test filtering by 'expired' status
  const expiredSessions =
    await api.functional.multiUserTodo.guest.sessions.index(guestConnection, {
      body: {
        status: "expired",
        page: 1,
        limit: 10,
      } satisfies IMultiUserTodoMemberSession.IRequest,
    });
  typia.assert(expiredSessions);
  // Validate expired sessions have correct status indicators
  TestValidator.predicate(
    "expired sessions have null deleted_at",
    expiredSessions.data.every((s) => s.deleted_at === null),
  );
  TestValidator.predicate(
    "expired sessions have past expired_at",
    expiredSessions.data.every((s) => new Date(s.expired_at) < new Date()),
  );
  // Validate pagination metadata for expired
  TestValidator.equals(
    "expired pagination current page",
    expiredSessions.pagination.current,
    1,
  );
  TestValidator.predicate(
    "expired pagination records matches data length",
    expiredSessions.pagination.records === expiredSessions.data.length,
  );
  // 4. Test filtering by 'deleted' status
  const deletedSessions =
    await api.functional.multiUserTodo.guest.sessions.index(guestConnection, {
      body: {
        status: "deleted",
        page: 1,
        limit: 10,
      } satisfies IMultiUserTodoMemberSession.IRequest,
    });
  typia.assert(deletedSessions);
  // Validate deleted sessions have correct status indicators
  TestValidator.predicate(
    "deleted sessions have non-null deleted_at",
    deletedSessions.data.every((s) => s.deleted_at !== null),
  );
  // Validate pagination metadata for deleted
  TestValidator.equals(
    "deleted pagination current page",
    deletedSessions.pagination.current,
    1,
  );
  TestValidator.predicate(
    "deleted pagination records matches data length",
    deletedSessions.pagination.records === deletedSessions.data.length,
  );
  // 5. Verify each status filter returns mutually exclusive results
  const activeIds = new Set(activeSessions.data.map((s) => s.id));
  const expiredIds = new Set(expiredSessions.data.map((s) => s.id));
  const deletedIds = new Set(deletedSessions.data.map((s) => s.id));
  TestValidator.predicate(
    "active and expired sessions are mutually exclusive",
    Array.from(activeIds).every((id) => !expiredIds.has(id)),
  );
  TestValidator.predicate(
    "active and deleted sessions are mutually exclusive",
    Array.from(activeIds).every((id) => !deletedIds.has(id)),
  );
  TestValidator.predicate(
    "expired and deleted sessions are mutually exclusive",
    Array.from(expiredIds).every((id) => !deletedIds.has(id)),
  );
  // 6. Test that status field is properly validated (only one status at a time)
  // The API should accept only one status value, which is already enforced by the type system
  // We verify that our requests with single status values work correctly above
}
