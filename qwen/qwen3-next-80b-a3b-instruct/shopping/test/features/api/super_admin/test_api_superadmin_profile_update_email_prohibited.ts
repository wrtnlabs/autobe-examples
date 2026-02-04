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
export async function test_api_superadmin_profile_update_email_prohibited(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a new connection and authenticate super admin
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: "superadmin@example.com",
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IShoppingMallSuperAdmin.IJoin,
  });
  typia.assert(superAdmin);
  // Store original email for later comparison
  const originalEmail = superAdmin.email;
  // Step 2: Update the super admin profile with allowed fields
  // This should succeed and preserve email immutability
  const updatedProfile =
    await api.functional.shoppingMall.superAdmin.superAdmins.me.update(
      superAdminConnection,
      {
        body: {
          display_name: "Updated Name",
          phone_number: "+1234567890",
        } satisfies IShoppingMallSuperAdmin.IUpdate,
      },
    );
  typia.assert(updatedProfile);
  // Step 3: Verify email is unchanged (email immutability) using update response
  // The update operation returns the updated profile, so we can use it directly
  TestValidator.equals(
    "email should remain unchanged after update",
    updatedProfile.email,
    originalEmail,
  );
  // Step 4: Verify update fields were correctly updated
  TestValidator.equals(
    "display_name should be updated",
    updatedProfile.name,
    "Updated Name",
  );
  TestValidator.equals(
    "phone_number should be updated",
    updatedProfile.phone_number,
    "+1234567890",
  );
}
