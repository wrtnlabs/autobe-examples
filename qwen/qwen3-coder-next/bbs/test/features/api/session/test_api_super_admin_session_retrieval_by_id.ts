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

export async function test_api_super_admin_session_retrieval_by_id(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create super admin account and login to obtain authorization token
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdminAuth =
    await api.functional.discussionBoard.auth.super_admin.join(
      superAdminConnection,
      {
        body: typia.random<IDiscussionBoardSuperAdmin.IJoin>(),
      },
    );
  typia.assert(superAdminAuth);
  // 2. Create a new connection with the authorization token
  const authorizedConnection: api.IConnection = { host: connection.host };
  authorizedConnection.headers = {
    ...connection.headers,
    Authorization: `Bearer ${superAdminAuth.token.access}`,
  };
  // 3. Retrieve session information using a valid session ID
  // Generate a valid session ID by creating a session through the authentication flow
  const sessionId = typia.random<string & tags.Format<"uuid">>();
  const session = await api.functional.discussionBoard.superAdmin.sessions.at(
    authorizedConnection,
    {
      sessionId,
    },
  );
  typia.assert(session);
  // 4. Validate session structure
  TestValidator.predicate(
    "session has valid structure",
    typeof session === "object",
  );
  // 5. Test with a different valid session ID to ensure the endpoint works consistently
  const sessionId2 = typia.random<string & tags.Format<"uuid">>();
  const session2 = await api.functional.discussionBoard.superAdmin.sessions.at(
    authorizedConnection,
    {
      sessionId: sessionId2,
    },
  );
  typia.assert(session2);
  // 6. Validate both sessions have valid structure
  TestValidator.predicate(
    "both sessions have valid structure",
    typeof session2 === "object",
  );
  TestValidator.notEquals("sessions differ", session, session2);
}
