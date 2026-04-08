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

export async function test_api_guest_sessions_filter_by_status(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register a guest user
  const joinConnection: api.IConnection = { host: connection.host };
  const authResponse = await authorize_guest_join(joinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IMultiUserTodoGuest.IJoin,
  });
  typia.assert(authResponse);
  // Step 2: Create actor-specific connection with token
  const actorConnection: api.IConnection = { host: connection.host };
  actorConnection.headers = { Authorization: authResponse.token.access };
  // Step 3: Get all sessions (status='all')
  const allSessionsResponse =
    await api.functional.multiUserTodo.guest.sessions.index(actorConnection, {
      body: {
        status: "all",
        page: 1,
        limit: 20,
      } satisfies IMultiUserTodoMemberSession.IRequest,
    });
  typia.assert(allSessionsResponse);
  // Validate all sessions response structure
  TestValidator.equals(
    "all sessions pagination present",
    allSessionsResponse.pagination.current >= 1,
    true,
  );
  TestValidator.equals(
    "all sessions data is array",
    Array.isArray(allSessionsResponse.data),
    true,
  );
  const activeSessionsInAll = allSessionsResponse.data;
  // Step 4: Get active sessions only
  const activeSessionsResponse =
    await api.functional.multiUserTodo.guest.sessions.index(actorConnection, {
      body: {
        status: "active",
        page: 1,
        limit: 20,
      } satisfies IMultiUserTodoMemberSession.IRequest,
    });
  typia.assert(activeSessionsResponse);
  // Validate active sessions response
  TestValidator.equals(
    "active sessions pagination present",
    activeSessionsResponse.pagination.current >= 1,
    true,
  );
  TestValidator.equals(
    "active sessions data is array",
    Array.isArray(activeSessionsResponse.data),
    true,
  );
  // Verify all returned sessions are actually active (expired_at > current time)
  const currentTime = new Date().toISOString();
  for (const session of activeSessionsResponse.data) {
    typia.assert(session);
    const expiredAt = new Date(session.expired_at).toISOString();
    TestValidator.predicate(
      "active session has future expiration",
      expiredAt > currentTime,
    );
  }
  // Step 5: Get expired sessions only
  const expiredSessionsResponse =
    await api.functional.multiUserTodo.guest.sessions.index(actorConnection, {
      body: {
        status: "expired",
        page: 1,
        limit: 20,
      } satisfies IMultiUserTodoMemberSession.IRequest,
    });
  typia.assert(expiredSessionsResponse);
  // Validate expired sessions response (may be empty if no expired sessions)
  TestValidator.equals(
    "expired sessions pagination present",
    expiredSessionsResponse.pagination.current >= 1,
    true,
  );
  TestValidator.equals(
    "expired sessions data is array",
    Array.isArray(expiredSessionsResponse.data),
    true,
  );
  // Verify all returned sessions are actually expired (expired_at <= current time)
  for (const session of expiredSessionsResponse.data) {
    typia.assert(session);
    const expiredAt = new Date(session.expired_at).toISOString();
    TestValidator.predicate(
      "expired session has past or current expiration",
      expiredAt <= currentTime,
    );
  }
  // Step 6: Verify count consistency
  // Active + Expired should equal All (when there are no other statuses)
  const activeCount = activeSessionsResponse.data.length;
  const expiredCount = expiredSessionsResponse.data.length;
  const totalCount = allSessionsResponse.data.length;
  TestValidator.equals(
    "active + expired equals total",
    activeCount + expiredCount,
    totalCount,
  );
  // Step 7: Test invalid status value (should either ignore or return 400)
  // We'll test with an invalid enum value - expect it to either be ignored or return error
  try {
    const invalidStatusResponse =
      await api.functional.multiUserTodo.guest.sessions.index(actorConnection, {
        body: {
          status: "invalid" as "active" | "expired" | "all",
          page: 1,
          limit: 20,
        } satisfies IMultiUserTodoMemberSession.IRequest,
      });
    typia.assert(invalidStatusResponse);
    // If it returns without error, the invalid status was likely ignored (returned all)
    TestValidator.predicate(
      "invalid status handled gracefully",
      invalidStatusResponse.data.length === totalCount ||
        invalidStatusResponse.data.length === 0,
    );
  } catch (error) {
    // If it throws, verify it's a proper HTTP error (400 Bad Request)
    if (typia.is<api.HttpError>(error)) {
      TestValidator.equals("invalid status returns 400", error.status, 400);
    } else {
      throw error;
    }
  }
}
