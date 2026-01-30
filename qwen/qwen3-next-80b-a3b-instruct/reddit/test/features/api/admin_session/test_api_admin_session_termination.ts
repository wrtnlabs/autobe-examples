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
export async function test_api_admin_session_termination(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create new connection and authenticate admin via join
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies ICommunityBbsAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // Step 2: Create admin session using the authenticated connection
  const session =
    await api.functional.communityBbs.admin.admin_sessions.create(
      adminConnection,
    );
  typia.assert(session);
  // Step 3: Terminate the session using the sessionId
  await api.functional.communityBbs.admin.admin_sessions.erase(
    adminConnection,
    {
      sessionId: session.sessionId,
    },
  );
  // Step 4: Validate that the terminated session cannot be used for further API calls
  // Attempting create session again with same connection should fail since session was terminated
  await TestValidator.error(
    "terminated session cannot be used for API calls",
    async () => {
      await api.functional.communityBbs.admin.admin_sessions.create(
        adminConnection,
      );
    },
  );
}
