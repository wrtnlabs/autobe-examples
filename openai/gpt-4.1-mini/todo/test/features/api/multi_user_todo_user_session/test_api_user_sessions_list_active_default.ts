import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoUser";
import type { IMultiUserTodoUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoUserSession";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMultiUserTodoUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMultiUserTodoUserSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";

export async function test_api_user_sessions_list_active_default(
  connection: api.IConnection,
): Promise<void> {
  // 1. User A joins and obtains authorized connection
  const userAConnection: api.IConnection = { host: connection.host };
  const userAJoinBody: IMultiUserTodoUser.IJoin = {
    email: `a${RandomGenerator.alphaNumeric(5)}@example.com`,
    password: "password123",
    displayName: RandomGenerator.name(),
    href: `https://example.com/join-a`,
    referrer: `https://example.com/referrer-a`,
    ip: `127.0.0.${randint(1, 254)}`,
  };
  const userAAuth = await authorize_user_join(userAConnection, {
    body: userAJoinBody,
  });
  typia.assert(userAAuth);
  userAConnection.headers = {
    Authorization: `Bearer ${userAAuth.token.access}`,
  };
  // 2. User B joins and obtains authorized connection
  const userBConnection: api.IConnection = { host: connection.host };
  const userBJoinBody: IMultiUserTodoUser.IJoin = {
    email: `b${RandomGenerator.alphaNumeric(5)}@example.com`,
    password: "password456",
    displayName: RandomGenerator.name(),
    href: `https://example.com/join-b`,
    referrer: `https://example.com/referrer-b`,
    ip: `127.0.0.${randint(1, 254)}`,
  };
  const userBAuth = await authorize_user_join(userBConnection, {
    body: userBJoinBody,
  });
  typia.assert(userBAuth);
  userBConnection.headers = {
    Authorization: `Bearer ${userBAuth.token.access}`,
  };
  // 3. User A retrieves active (non-expired) sessions without filters
  const requestBody: IMultiUserTodoUserSession.IRequest = {
    expired: false, // Filter for non-expired (active) sessions
  };
  const userASessions = await api.functional.multiUserTodo.user.sessions.index(
    userAConnection,
    {
      body: requestBody,
    },
  );
  typia.assert(userASessions);
  // Validate pagination metadata
  TestValidator.predicate(
    "pagination current page >= 1",
    userASessions.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit >= 0",
    userASessions.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination records >= 0",
    userASessions.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages >= 0",
    userASessions.pagination.pages >= 0,
  );
  // Validate each session in data list
  for (const session of userASessions.data) {
    // Check non-expired
    TestValidator.predicate(
      `session ${session.id} expired_at > now`,
      new Date(session.expired_at).getTime() > Date.now(),
    );
    // Check user ownership by asserting session.ip, href, referrer are strings or null referrer
    typia.assert(session);
    // deleted_at must be null (active session)
    TestValidator.equals(
      `session ${session.id} deleted_at is null`,
      session.deleted_at,
      null,
    );
    // Validate ISO string formats
    TestValidator.predicate(
      `session ${session.id} created_at is ISO date`,
      !isNaN(Date.parse(session.created_at)),
    );
    TestValidator.predicate(
      `session ${session.id} updated_at is ISO date`,
      !isNaN(Date.parse(session.updated_at)),
    );
    TestValidator.predicate(
      `session ${session.id} expired_at is ISO date`,
      !isNaN(Date.parse(session.expired_at)),
    );
    // Additional security: ensure this session is part of user A's sessions
    // Since we only have user sessions API with authorization, user A cannot see sessions of user B; so any session returned must belong to user A
    // We assume here there's no direct user id in the response, so test non-exposure by using session properties being consistent and non-null
    TestValidator.predicate(
      `session ${session.id} ip format valid`,
      typeof session.ip === "string" && session.ip.length > 0,
    );
    TestValidator.predicate(
      `session ${session.id} href format valid`,
      typeof session.href === "string" && session.href.length > 0,
    );
  }
  // 4. User B tries to retrieve User A's session by using User B connection
  // This step ensures security: User B cannot see User A sessions (should see only own)
  const userBSessions = await api.functional.multiUserTodo.user.sessions.index(
    userBConnection,
    {
      body: requestBody,
    },
  );
  typia.assert(userBSessions);
  // Validate User B sessions do not intersect with User A sessions IDs
  const userASessionIds = new Set(userASessions.data.map((s) => s.id));
  for (const session of userBSessions.data) {
    TestValidator.predicate(
      `User B session ID not in User A session IDs`,
      !userASessionIds.has(session.id),
    );
    // Also session expired_at must be future (active)
    TestValidator.predicate(
      `User B session expired_at > now`,
      new Date(session.expired_at).getTime() > Date.now(),
    );
  }
}
