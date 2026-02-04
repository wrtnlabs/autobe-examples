import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAuthorizationToken";
import type { IShoppingMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSuperAdmin";
import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";
export async function test_api_superadmin_profile_retrieval(
  connection: api.IConnection,
) {
  // Step 1: Create a new connection for super admin registration
  const superAdminConnection: api.IConnection = { host: connection.host };
  // Step 2: Register a new super admin account using the utility function
  const superAdmin: IShoppingMallSuperAdmin.IAuthorized =
    await authorize_super_admin_join(superAdminConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
      } satisfies IShoppingMallSuperAdmin.IJoin,
    });
  // Step 3: Create a new connection for profile retrieval with authentication headers
  const profileConnection: api.IConnection = { host: connection.host };
  // Step 4: Retrieve the super admin profile using the authenticated connection
  const profile: IShoppingMallSuperAdmin =
    await api.functional.shoppingMall.superAdmin.superAdmins.me.at(
      profileConnection,
    );
  // Step 5: Validate that the returned profile contains only allowed non-sensitive fields
  typia.assert(profile);
  // Step 6: Verify that the profile data matches expected fields
  TestValidator.equals("profile has correct id", profile.id, superAdmin.id);
  TestValidator.equals(
    "profile has correct email",
    profile.email,
    superAdmin.email,
  );
  TestValidator.equals(
    "profile has correct createdAt",
    profile.createdAt,
    superAdmin.createdAt,
  );
  TestValidator.equals(
    "profile has correct updatedAt",
    profile.updatedAt,
    superAdmin.updatedAt,
  );
  TestValidator.equals(
    "profile has correct adminType",
    profile.adminType,
    "super",
  );
  // Step 7: Verify that profile retrieval fails with 403 for unauthenticated connection
  const unauthenticatedConnection: api.IConnection = { host: connection.host };
  await TestValidator.error(
    "unauthenticated request should return 403",
    async () => {
      await api.functional.shoppingMall.superAdmin.superAdmins.me.at(
        unauthenticatedConnection,
      );
    },
  );
}
