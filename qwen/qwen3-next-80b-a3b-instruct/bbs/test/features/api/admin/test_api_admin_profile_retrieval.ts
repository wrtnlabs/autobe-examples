import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicForumAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicForumAdmin";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_admin_profile_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a new connection for admin registration
  const adminConnection: api.IConnection = { host: connection.host };
  // Step 2: Register a new admin account using the utility function
  const admin: IEconomicForumAdmin.IAuthorized = await authorize_admin_join(
    adminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
      } satisfies IEconomicForumAdmin.IJoin,
    },
  );
  typia.assert(admin);
  // Step 3: Create a new connection for profile retrieval using the adminId from registration
  const profileConnection: api.IConnection = { host: connection.host };
  // Step 4: Use the adminId from registration to retrieve the admin profile
  const adminProfile: IEconomicForumAdmin =
    await api.functional.economicForum.admin.admins.at(profileConnection, {
      adminId: admin.id,
    });
  typia.assert(adminProfile);
  // Step 5: Validate that the retrieved profile matches expected schema
  TestValidator.equals("admin ID matches", adminProfile.id, admin.id);
  TestValidator.equals(
    "token structure matches",
    adminProfile.token.access,
    admin.token.access,
  );
  TestValidator.equals(
    "token refresh matches",
    adminProfile.token.refresh,
    admin.token.refresh,
  );
  TestValidator.equals(
    "token expired_at matches",
    adminProfile.token.expired_at,
    admin.token.expired_at,
  );
  TestValidator.equals(
    "token refreshable_until matches",
    adminProfile.token.refreshable_until,
    admin.token.refreshable_until,
  );
}
