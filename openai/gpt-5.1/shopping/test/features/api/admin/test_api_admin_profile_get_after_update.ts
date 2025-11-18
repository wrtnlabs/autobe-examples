import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallAdminProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminProfile";

/**
 * Validate that admin profile GET returns latest updated profile data.
 *
 * Business goal
 *
 * - Ensure that when an administrator updates their profile, subsequent retrieval
 *   through the GET endpoint reflects the latest data and timestamps rather
 *   than a stale or cached copy.
 *
 * End-to-end flow
 *
 * 1. Register a new admin using POST /auth/admin/join to obtain an authenticated
 *    context (token is handled by SDK) and adminId.
 * 2. Fetch the current admin profile via GET
 *    /shoppingMall/admin/admins/{adminId}/profile to capture baseline values,
 *    including created_at and updated_at.
 * 3. Update the admin profile using PUT
 *    /shoppingMall/admin/admins/{adminId}/profile with non-null full_name and
 *    phone_number via IShoppingMallAdminProfile.IUpdate.
 * 4. Fetch the admin profile again using the same GET endpoint.
 * 5. Validate that the GET response reflects the updated full_name and
 *    phone_number, keeps immutable properties stable, and has a newer or equal
 *    updated_at while deleted_at remains null.
 *
 * Assertions
 *
 * - The profile id does not change after update.
 * - Shopping_mall_admin_id stays the same and matches the authenticated admin id.
 * - Created_at is stable between before/after snapshots.
 * - Updated_at after update is >= original updated_at.
 * - The reloaded profile equals the profile returned by the update call for all
 *   fields (no stale cache).
 * - Deleted_at remains null (active profile).
 */
export async function test_api_admin_profile_get_after_update(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a new admin via join
  const joinBody = typia.random<IShoppingMallAdminJoin.ICreate>();

  const authorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: joinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(authorized);

  const adminId: string = authorized.id;

  // 2. Baseline profile fetch before update
  const before: IShoppingMallAdminProfile =
    await api.functional.shoppingMall.admin.admins.profile.at(connection, {
      adminId,
    });
  typia.assert<IShoppingMallAdminProfile>(before);

  // 3. Perform profile update with non-null full_name and phone_number
  const newFullName: string = RandomGenerator.name();
  const newPhoneNumber: string = RandomGenerator.mobile();

  const updateBody = {
    full_name: newFullName,
    phone_number: newPhoneNumber,
  } satisfies IShoppingMallAdminProfile.IUpdate;

  const updatedProfile: IShoppingMallAdminProfile =
    await api.functional.shoppingMall.admin.admins.profile.update(connection, {
      adminId,
      body: updateBody,
    });
  typia.assert<IShoppingMallAdminProfile>(updatedProfile);

  // Basic sanity: updated profile should reflect requested changes
  TestValidator.equals(
    "updated profile full_name matches requested value",
    updatedProfile.full_name,
    newFullName,
  );
  TestValidator.equals(
    "updated profile phone_number matches requested value",
    updatedProfile.phone_number,
    newPhoneNumber,
  );

  // 4. Re-fetch profile after update
  const reloaded: IShoppingMallAdminProfile =
    await api.functional.shoppingMall.admin.admins.profile.at(connection, {
      adminId,
    });
  typia.assert<IShoppingMallAdminProfile>(reloaded);

  // 5. Business validations
  // Identity and ownership consistency
  TestValidator.equals(
    "profile id should remain stable across update",
    reloaded.id,
    before.id,
  );
  TestValidator.equals(
    "profile shopping_mall_admin_id should remain stable",
    reloaded.shopping_mall_admin_id,
    before.shopping_mall_admin_id,
  );
  TestValidator.equals(
    "profile shopping_mall_admin_id should match authorized admin id",
    reloaded.shopping_mall_admin_id,
    adminId,
  );

  // Updated fields reflect new values
  TestValidator.equals(
    "reloaded full_name matches updated value",
    reloaded.full_name,
    newFullName,
  );
  TestValidator.equals(
    "reloaded phone_number matches updated value",
    reloaded.phone_number,
    newPhoneNumber,
  );

  // created_at should not change
  TestValidator.equals(
    "created_at should remain unchanged after profile update",
    reloaded.created_at,
    before.created_at,
  );

  // updated_at should be >= previous updated_at and equal to update response timestamp
  TestValidator.predicate(
    "updated_at after update should be >= initial updated_at",
    reloaded.updated_at >= before.updated_at,
  );
  TestValidator.equals(
    "reloaded updated_at should equal updatedProfile.updated_at",
    reloaded.updated_at,
    updatedProfile.updated_at,
  );

  // deleted_at should remain null (or at least unchanged and not set by update)
  TestValidator.equals(
    "profile remains not soft-deleted after update (deleted_at stays null)",
    reloaded.deleted_at ?? null,
    before.deleted_at ?? null,
  );

  // Optional: ensure repeated GETs are stable (no further mutation)
  const reloadedAgain: IShoppingMallAdminProfile =
    await api.functional.shoppingMall.admin.admins.profile.at(connection, {
      adminId,
    });
  typia.assert<IShoppingMallAdminProfile>(reloadedAgain);

  TestValidator.equals(
    "subsequent GET after update returns same profile snapshot",
    reloadedAgain,
    reloaded,
  );
}
