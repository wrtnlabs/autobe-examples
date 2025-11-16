import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdminUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminUserJoin";
import type { IDiscussionBoardAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminuser";
import type { IDiscussionBoardAdminuserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminuserSession";

export async function test_api_admin_session_detail_unauthorized_without_token(
  connection: api.IConnection,
) {
  // 1. Prepare an unauthenticated connection by cloning and clearing headers.
  //    We MUST NOT touch headers on the original `connection` as the SDK owns it.
  const unauthConn: api.IConnection = { ...connection, headers: {} };

  // 2. Prepare random identifiers for adminUserId and sessionId.
  //    The focus of this test is authorization, not resource existence, so
  //    any UUID-like strings are sufficient. The backend should enforce
  //    authorization before returning any sensitive data.
  const adminUserId: string = typia.random<string & tags.Format<"uuid">>();
  const sessionId: string = typia.random<string & tags.Format<"uuid">>();

  // 3. Attempt to retrieve the admin session detail without Authorization
  //    header and assert that an error is thrown. We intentionally avoid
  //    inspecting the specific HTTP status code or error payload, because
  //    the testing framework prohibits status-specific assertions here.
  await TestValidator.error(
    "unauthorized admin session detail without token must fail",
    async () => {
      await api.functional.discussionBoard.adminUser.adminUsers.sessions.at(
        unauthConn,
        {
          adminUserId,
          sessionId,
        },
      );
    },
  );
}
