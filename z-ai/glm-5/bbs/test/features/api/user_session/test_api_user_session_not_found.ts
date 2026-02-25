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
 * Test that the API returns 404 Not Found when attempting to retrieve
 * a session that does not exist.
 *
 * Steps:
 * 1. Register a new user via join endpoint to establish authentication
 * 2. Generate a random UUID that does not correspond to any existing session
 * 3. Call GET /sessions/{sessionId} with the non-existent UUID
 * 4. Verify the response returns 404 Not Found status
 */
export async function test_api_user_session_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create user-specific connection and register
  const userConnection: api.IConnection = { host: connection.host };
  await authorize_user_join(userConnection, {});
  // 2. Generate a random UUID for non-existent session
  const nonExistentSessionId = typia.random<string & tags.Format<"uuid">>();
  // 3. Test that the API returns 404 Not Found
  await TestValidator.httpError(
    "should return 404 for non-existent session",
    404,
    async () => {
      await api.functional.discussionBoard.user.sessions.at(userConnection, {
        sessionId: nonExistentSessionId,
      });
    },
  );
}
