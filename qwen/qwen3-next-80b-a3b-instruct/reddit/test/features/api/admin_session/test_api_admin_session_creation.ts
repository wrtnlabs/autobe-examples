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
export async function test_api_admin_session_creation(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a new admin user account using the authorization utility function
  const adminConnection: api.IConnection = { host: connection.host };
  const admin: ICommunityBbsAdmin.IAuthorized = await authorize_admin_join(
    adminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<
          string & tags.MinLength<8> & tags.MaxLength<128>
        >(),
      } satisfies ICommunityBbsAdmin.IJoin,
    },
  );
  typia.assert(admin);
  // Step 2: Use the adminConnection (with auth token in headers) to create a session
  const session: ICommunityBbsAdminSession =
    await api.functional.communityBbs.admin.admin_sessions.create(
      adminConnection,
    );
  typia.assert(session);
  // Step 3: Validate session properties
  TestValidator.equals(
    "session adminId matches admin id",
    session.adminId,
    admin.id,
  );
  TestValidator.notEquals("userAgent is not empty", session.userAgent, "");
  TestValidator.equals("session logoutTime is null", session.logoutTime, null);
}
