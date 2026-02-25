import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import type { IDiscussionBoardSuperAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdminSession";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

/**
 * Test session retrieval when session ID does not exist.
 * Authenticate as super administrator via join endpoint to establish valid session.
 * Attempt to retrieve session using non-existent UUID.
 * Verify appropriate 404 error response is returned with descriptive message
 * indicating session not found. Validate that error handling does not leak
 * sensitive information about existing sessions.
 */
export async function test_api_super_admin_session_retrieval_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create actor-specific connection for super administrator authentication
  const authConnection: api.IConnection = { host: connection.host };
  // 2. Authenticate super administrator using join endpoint via utility function
  const authResult = await authorize_super_admin_join(authConnection, {});
  typia.assert(authResult);
  // 3. Create another connection for API calls with authenticated headers
  const superAdminConnection: api.IConnection = { host: connection.host };
  superAdminConnection.headers = {
    ...superAdminConnection.headers,
    Authorization: authResult.token.access,
  };
  // 4. Generate a random UUID that does not exist in the system
  const nonExistentSessionId = typia.random<string & tags.Format<"uuid">>();
  // 5. Attempt to retrieve non-existent session and verify 404 error
  await TestValidator.httpError(
    "session retrieval should return 404 for non-existent session",
    404,
    async () =>
      await api.functional.discussionBoard.superAdmin.super_admins.sessions.at(
        superAdminConnection,
        { sessionId: nonExistentSessionId },
      ),
  );
}
