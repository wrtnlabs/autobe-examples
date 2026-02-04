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
export async function test_api_superadmin_profile_update_success(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a new super administrator account
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin: IShoppingMallSuperAdmin.IAuthorized =
    await authorize_super_admin_join(superAdminConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
      } satisfies IShoppingMallSuperAdmin.IJoin,
    });
  typia.assert(superAdmin);
  // Store original timestamp to verify update
  const originalCreatedAt = superAdmin.createdAt;
  const originalUpdatedAt = superAdmin.updatedAt;
  // Step 2: Use the authenticated super admin connection to update profile
  const updatedDisplayName = RandomGenerator.name();
  const updatedPhoneNumber = RandomGenerator.mobile();
  const updatedAvatarUrl = typia.random<string & tags.Format<"uri">>();
  const updatedProfile: IShoppingMallSuperAdmin =
    await api.functional.shoppingMall.superAdmin.superAdmins.me.update(
      superAdminConnection,
      {
        body: {
          display_name: updatedDisplayName,
          phone_number: updatedPhoneNumber,
          avatar_url: updatedAvatarUrl,
        } satisfies IShoppingMallSuperAdmin.IUpdate,
      },
    );
  typia.assert(updatedProfile);
  // Step 3: Validate the updated profile
  TestValidator.equals(
    "profile ID matches original",
    updatedProfile.id,
    superAdmin.id,
  );
  TestValidator.equals(
    "display name updated",
    updatedProfile.name,
    updatedDisplayName,
  );
  TestValidator.equals(
    "phone number updated",
    updatedProfile.phone_number,
    updatedPhoneNumber,
  );
  TestValidator.equals(
    "avatar URL updated",
    updatedProfile.avatar_url,
    updatedAvatarUrl,
  );
  TestValidator.equals(
    "email preserved",
    updatedProfile.email,
    superAdmin.email,
  );
  TestValidator.equals(
    "adminType preserved",
    updatedProfile.adminType,
    "super",
  );
  // Step 4: Confirm timestamps were updated to indicate snapshot creation
  TestValidator.predicate(
    "updated_at changed after update",
    () => updatedProfile.updatedAt !== originalUpdatedAt,
  );
  TestValidator.predicate(
    "created_at unchanged after update",
    () => updatedProfile.createdAt === originalCreatedAt,
  );
  // Step 5: Verify all expected profile fields are present
  TestValidator.predicate(
    "name is defined",
    () => updatedProfile.name !== undefined,
  );
  TestValidator.predicate(
    "phone_number is defined",
    () => updatedProfile.phone_number !== undefined,
  );
  TestValidator.predicate(
    "avatar_url is defined",
    () => updatedProfile.avatar_url !== undefined,
  );
  TestValidator.predicate(
    "email is defined",
    () => updatedProfile.email !== undefined,
  );
  TestValidator.predicate(
    "adminType is defined",
    () => updatedProfile.adminType !== undefined,
  );
  TestValidator.predicate(
    "createdAt is defined",
    () => updatedProfile.createdAt !== undefined,
  );
  TestValidator.predicate(
    "updatedAt is defined",
    () => updatedProfile.updatedAt !== undefined,
  );
}
