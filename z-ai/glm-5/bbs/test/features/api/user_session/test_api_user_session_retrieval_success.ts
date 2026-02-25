import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import type { IDiscussionBoardUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUserSession";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";

/**
 * Test that an authenticated user can successfully retrieve details of their own session.
 * Steps:
 * 1. Register a new user via join endpoint (creates initial session)
 * 2. Use the authenticated connection to retrieve session details
 * 3. Validate session response matches the authenticated user
 */
export async function test_api_user_session_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new user and create initial session
  const userConnection: api.IConnection = { host: connection.host };
  const joinResponse = await authorize_user_join(userConnection, {});
  typia.assert(joinResponse);
  // 2. Retrieve session using the refresh token as session identifier
  const session = await api.functional.discussionBoard.user.sessions.at(
    userConnection,
    {
      sessionId: joinResponse.token.refresh,
    },
  );
  typia.assert(session);
  // 3. Validate session user matches the authenticated user from join
  TestValidator.equals("session user id", session.user.id, joinResponse.id);
  TestValidator.equals(
    "session user email",
    session.user.email,
    joinResponse.email,
  );
  TestValidator.equals(
    "session user displayName",
    session.user.displayName,
    joinResponse.displayName,
  );
  TestValidator.equals(
    "refresh token matches",
    session.refreshToken,
    joinResponse.token.refresh,
  );
}
