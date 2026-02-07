import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMemberSession";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

export async function test_api_super_admin_session_retrieval_nonexistent(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create super admin account for authentication
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdminAuth =
    await api.functional.discussionBoard.auth.super_admin.join(
      superAdminConnection,
      {
        body: typia.random<IDiscussionBoardSuperAdmin.IJoin>(),
      },
    );
  typia.assert(superAdminAuth);
  // Update connection with the authorization token
  superAdminConnection.headers = {
    ...superAdminConnection.headers,
    Authorization: superAdminAuth.token.access,
  };
  // Step 2: Generate a random session ID that does not exist
  const nonExistentSessionId = typia.random<string & tags.Format<"uuid">>();
  // Step 3: Attempt to retrieve non-existent session
  const session = await api.functional.discussionBoard.superAdmin.sessions.at(
    superAdminConnection,
    {
      sessionId: nonExistentSessionId,
    },
  );
  // Step 4: Validate response - should return null for non-existent session
  TestValidator.equals("non-existent session returns null", session, null);
}
