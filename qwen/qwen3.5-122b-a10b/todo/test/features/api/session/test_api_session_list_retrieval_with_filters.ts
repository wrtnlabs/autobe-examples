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

export async function test_api_session_list_retrieval_with_filters(
  connection: api.IConnection,
): Promise<void> {
  // 1. Guest authentication via utility function
  const guestConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_guest_join(guestConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IMultiUserTodoGuest.IJoin,
  });
  typia.assert(authorized);
  // 2. Retrieve session list with default parameters (no filters)
  const defaultSessions =
    await api.functional.multiUserTodo.guest.sessions.index(guestConnection, {
      body: {} satisfies IMultiUserTodoMemberSession.IRequest,
    });
  typia.assert(defaultSessions);
  // Validate pagination metadata structure
  TestValidator.predicate(
    "pagination has current page",
    defaultSessions.pagination.current !== undefined,
  );
  TestValidator.predicate(
    "pagination has limit",
    defaultSessions.pagination.limit !== undefined,
  );
  TestValidator.predicate(
    "pagination has records",
    defaultSessions.pagination.records !== undefined,
  );
  TestValidator.predicate(
    "pagination has pages",
    defaultSessions.pagination.pages !== undefined,
  );
  // 3. Test pagination parameters
  const paginatedSessions =
    await api.functional.multiUserTodo.guest.sessions.index(guestConnection, {
      body: {
        page: 1,
        limit: 10,
      } satisfies IMultiUserTodoMemberSession.IRequest,
    });
  typia.assert(paginatedSessions);
  TestValidator.equals(
    "pagination page is 1",
    paginatedSessions.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit is 10",
    paginatedSessions.pagination.limit,
    10,
  );
  // 4. Test sorting by created_at ascending
  const sortedAscSessions =
    await api.functional.multiUserTodo.guest.sessions.index(guestConnection, {
      body: {
        sort_by: "created_at",
        sort_order: "asc",
      } satisfies IMultiUserTodoMemberSession.IRequest,
    });
  typia.assert(sortedAscSessions);
  // 5. Test sorting by created_at descending
  const sortedDescSessions =
    await api.functional.multiUserTodo.guest.sessions.index(guestConnection, {
      body: {
        sort_by: "created_at",
        sort_order: "desc",
      } satisfies IMultiUserTodoMemberSession.IRequest,
    });
  typia.assert(sortedDescSessions);
  // 6. Test sorting by expired_at ascending
  const expiredAscSessions =
    await api.functional.multiUserTodo.guest.sessions.index(guestConnection, {
      body: {
        sort_by: "expired_at",
        sort_order: "asc",
      } satisfies IMultiUserTodoMemberSession.IRequest,
    });
  typia.assert(expiredAscSessions);
  // 7. Test sorting by expired_at descending
  const expiredDescSessions =
    await api.functional.multiUserTodo.guest.sessions.index(guestConnection, {
      body: {
        sort_by: "expired_at",
        sort_order: "desc",
      } satisfies IMultiUserTodoMemberSession.IRequest,
    });
  typia.assert(expiredDescSessions);
  // 8. Test date range filtering on created_at
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const dateFilteredSessions =
    await api.functional.multiUserTodo.guest.sessions.index(guestConnection, {
      body: {
        created_at_from: thirtyDaysAgo.toISOString(),
        created_at_to: now.toISOString(),
      } satisfies IMultiUserTodoMemberSession.IRequest,
    });
  typia.assert(dateFilteredSessions);
  // 9. Test date range filtering on expired_at
  const expiredFilteredSessions =
    await api.functional.multiUserTodo.guest.sessions.index(guestConnection, {
      body: {
        expired_at_from: thirtyDaysAgo.toISOString(),
        expired_at_to: now.toISOString(),
      } satisfies IMultiUserTodoMemberSession.IRequest,
    });
  typia.assert(expiredFilteredSessions);
  // 10. Test status filtering (active)
  const activeSessions =
    await api.functional.multiUserTodo.guest.sessions.index(guestConnection, {
      body: {
        status: "active",
      } satisfies IMultiUserTodoMemberSession.IRequest,
    });
  typia.assert(activeSessions);
  // 11. Test status filtering (expired)
  const expiredSessions =
    await api.functional.multiUserTodo.guest.sessions.index(guestConnection, {
      body: {
        status: "expired",
      } satisfies IMultiUserTodoMemberSession.IRequest,
    });
  typia.assert(expiredSessions);
  // 12. Test status filtering (deleted)
  const deletedSessions =
    await api.functional.multiUserTodo.guest.sessions.index(guestConnection, {
      body: {
        status: "deleted",
      } satisfies IMultiUserTodoMemberSession.IRequest,
    });
  typia.assert(deletedSessions);
  // 13. Privacy boundary validation - verify all sessions belong to authenticated guest
  const allSessions = await api.functional.multiUserTodo.guest.sessions.index(
    guestConnection,
    {
      body: {} satisfies IMultiUserTodoMemberSession.IRequest,
    },
  );
  typia.assert(allSessions);
  for (const session of allSessions.data) {
    TestValidator.equals(
      "session member id matches guest",
      session.member.id,
      authorized.id,
    );
  }
}
