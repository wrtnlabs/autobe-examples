import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneModerator";
import type { IRedditCloneModeratorSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneModeratorSession";
import type { IRedditCloneUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";

/**
 * Test retrieving a non-existent moderator session returns 404 Not Found.
 *
 * Validates that attempting to retrieve a moderator session with a non-existent UUID properly returns a 404 HTTP error. This test ensures the API correctly handles requests for sessions that do not exist in the system, preventing information leakage and maintaining proper error handling.
 *
 * The test follows these steps:
 * 1. Register and authenticate a new moderator account to obtain an authenticated connection
 * 2. Generate a random UUID that does not correspond to any existing session
 * 3. Attempt to retrieve the non-existent session using the authenticated moderator connection
 * 4. Verify that the API returns a 404 Not Found HTTP error
 */
export async function test_api_moderator_session_retrieve_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate moderator
  const moderatorConnection: api.IConnection = { host: connection.host };
  await authorize_moderator_join(moderatorConnection, {});
  // 2. Generate a non-existent session ID
  const nonExistentSessionId = typia.random<string & tags.Format<"uuid">>();
  // 3. Attempt to retrieve non-existent session and verify 404 error
  await TestValidator.httpError(
    "non-existent session returns 404",
    404,
    async () =>
      await api.functional.redditClone.moderator.moderator.sessions.at(
        moderatorConnection,
        { sessionId: nonExistentSessionId },
      ),
  );
}
