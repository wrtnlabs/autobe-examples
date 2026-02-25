import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import type { ICommunityPlatformUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUserSession";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformUserSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";

export async function test_api_user_session_search_active_sessions(
  connection: api.IConnection,
): Promise<void> {
  // Register and authenticate as a test user
  const userConnection: api.IConnection = { host: connection.host };
  const user = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.alphaNumeric(12),
    } satisfies ICommunityPlatformUser.IJoin,
  });
  typia.assert(user);
  // Search for active sessions for the authenticated user
  const searchRequest = {
    user_id: user.id,
    expired: false,
    limit: 10,
    page: 1,
  } satisfies ICommunityPlatformUserSession.IRequest;
  const response = await api.functional.communityPlatform.user.sessions.index(
    userConnection,
    { body: searchRequest },
  );
  typia.assert(response);
  // Validate pagination metadata
  TestValidator.equals(
    "pagination limit matches requested",
    response.pagination.limit,
    10,
  );
  TestValidator.equals("current page is 1", response.pagination.current, 1);
  TestValidator.predicate(
    "total pages is calculated correctly",
    response.pagination.pages >= 1,
  );
  TestValidator.predicate(
    "total records is non-negative",
    response.pagination.records >= 0,
  );
  // Validate session data structure for each returned session
  for (const session of response.data) {
    typia.assert(session);
    // Validate user agent exists (business logic, not type validation)
    TestValidator.predicate(
      "user agent is non-empty string",
      session.user_agent.length > 0,
    );
    // Validate active session filter (not expired) - business logic test
    TestValidator.predicate(
      "active session should not be expired",
      new Date(session.expired_at) > new Date(),
    );
    // Validate user information in session summary
    typia.assert(session.user);
    TestValidator.equals(
      "user ID matches authenticated user",
      session.user.id,
      user.id,
    );
    TestValidator.equals(
      "username matches authenticated user",
      session.user.username,
      user.username,
    );
  }
  // Validate that response contains at least one session (the current one)
  TestValidator.predicate(
    "should contain at least one active session",
    response.data.length >= 1,
  );
  // Validate that all sessions belong to the authenticated user
  for (const session of response.data) {
    TestValidator.equals(
      "session user ID matches authenticated user",
      session.user.id,
      user.id,
    );
  }
}
