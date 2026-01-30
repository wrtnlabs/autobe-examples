import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityBbsAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsAdmin";
import type { ICommunityBbsAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsAdminSession";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_admin_session_retrieval_by_id(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create new connection and join admin via utility function (POST /communityBbs/auth/admin/join)
  const adminConnection: api.IConnection = { host: connection.host };
  const admin: ICommunityBbsAdmin.IAuthorized = await authorize_admin_join(
    adminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
      } satisfies ICommunityBbsAdmin.IJoin,
    },
  );
  typia.assert(admin);
  // Step 2: Use adminConnection to create a new session (POST /communityBbs/admin/admin_sessions)
  const createdSession: ICommunityBbsAdminSession =
    await api.functional.communityBbs.admin.admin_sessions.create(
      adminConnection,
    );
  typia.assert(createdSession);
  // Step 3: Retrieve the session by sessionId using adminConnection (GET /communityBbs/admin/admin_sessions/{sessionId})
  const retrievedSession: ICommunityBbsAdminSession =
    await api.functional.communityBbs.admin.admin_sessions.at(adminConnection, {
      sessionId: createdSession.sessionId,
    });
  typia.assert(retrievedSession);
  // Step 4: Validate retrieved session properties
  TestValidator.equals(
    "session ID matches",
    retrievedSession.sessionId,
    createdSession.sessionId,
  );
  TestValidator.equals("admin ID matches", retrievedSession.adminId, admin.id);
  TestValidator.equals(
    "logout time should be null for active session",
    retrievedSession.logoutTime,
    null,
  );
}
