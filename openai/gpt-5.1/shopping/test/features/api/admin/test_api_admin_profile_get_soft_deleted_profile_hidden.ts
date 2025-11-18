import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallAdminProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminProfile";

/**
 * Verify that an admin profile can be created/updated and then read back
 * correctly, establishing a baseline for non-deleted visibility.
 *
 * Business intent (rewritten from the original soft-delete scenario):
 *
 * - Ensure that a freshly joined admin has a retrievable profile row once it has
 *   been updated/created through the profile update endpoint.
 * - Confirm that GET /shoppingMall/admin/admins/{adminId}/profile returns a valid
 *   IShoppingMallAdminProfile for an active (non–soft-deleted) profile and that
 *   the profile is associated with the correct admin.
 * - Confirm that mutable fields in IShoppingMallAdminProfile.IUpdate are
 *   persisted and visible through subsequent reads.
 * - Establish that deleted_at is null/undefined for an active profile, which
 *   serves as a baseline when future test fixtures can simulate soft deletion.
 *
 * Steps:
 *
 * 1. Join a new admin via POST /auth/admin/join, capturing the authorized admin
 *    context (IShoppingMallAdmin.IAuthorized).
 * 2. Use PUT /shoppingMall/admin/admins/{adminId}/profile to upsert the admin's
 *    profile with concrete full_name and phone_number values.
 * 3. Read the profile back using GET /shoppingMall/admin/admins/{adminId}/profile.
 * 4. Validate:
 *
 *    - Response type matches IShoppingMallAdminProfile via typia.assert.
 *    - Shopping_mall_admin_id equals the admin.id from the join response.
 *    - Full_name and phone_number reflect the latest update payload.
 *    - Deleted_at is null or undefined, representing a non–soft-deleted profile.
 * 5. Optionally, re-read the profile to ensure idempotence of GET.
 */
export async function test_api_admin_profile_get_soft_deleted_profile_hidden(
  connection: api.IConnection,
) {
  // 1. Join a new admin and obtain its authorized context
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const authorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: joinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(authorized);

  const adminId = authorized.id;

  // 2. Update/create the admin profile so that a profile row exists
  const updateBody = {
    full_name: RandomGenerator.name(),
    phone_number: RandomGenerator.mobile(),
  } satisfies IShoppingMallAdminProfile.IUpdate;

  const updatedProfile: IShoppingMallAdminProfile =
    await api.functional.shoppingMall.admin.admins.profile.update(connection, {
      adminId,
      body: updateBody,
    });
  typia.assert<IShoppingMallAdminProfile>(updatedProfile);

  // Validate that the updated profile belongs to the same admin
  TestValidator.equals(
    "updated profile belongs to the joined admin",
    updatedProfile.shopping_mall_admin_id,
    adminId,
  );

  // Validate that mutable fields have been applied
  TestValidator.equals(
    "updated profile full_name reflects update body",
    updatedProfile.full_name ?? null,
    updateBody.full_name ?? null,
  );
  TestValidator.equals(
    "updated profile phone_number reflects update body",
    updatedProfile.phone_number ?? null,
    updateBody.phone_number ?? null,
  );

  // For a freshly created/updated profile, deleted_at should be null/undefined
  TestValidator.equals(
    "updated profile is not soft-deleted (deleted_at is null/undefined)",
    updatedProfile.deleted_at ?? null,
    null,
  );

  // 3. Read the profile back via GET endpoint to verify baseline visibility
  const fetchedProfile: IShoppingMallAdminProfile =
    await api.functional.shoppingMall.admin.admins.profile.at(connection, {
      adminId,
    });
  typia.assert<IShoppingMallAdminProfile>(fetchedProfile);

  // Validate that the fetched profile still belongs to the same admin
  TestValidator.equals(
    "fetched profile belongs to the joined admin",
    fetchedProfile.shopping_mall_admin_id,
    adminId,
  );

  // Validate that fetched profile matches the latest updated fields
  TestValidator.equals(
    "fetched profile full_name matches updated profile",
    fetchedProfile.full_name ?? null,
    updatedProfile.full_name ?? null,
  );
  TestValidator.equals(
    "fetched profile phone_number matches updated profile",
    fetchedProfile.phone_number ?? null,
    updatedProfile.phone_number ?? null,
  );

  // Again, confirm non–soft-deleted status on fetched profile
  TestValidator.equals(
    "fetched profile is not soft-deleted (deleted_at is null/undefined)",
    fetchedProfile.deleted_at ?? null,
    null,
  );

  // 4. Optional idempotence check: second GET should yield equivalent data
  const fetchedProfileAgain: IShoppingMallAdminProfile =
    await api.functional.shoppingMall.admin.admins.profile.at(connection, {
      adminId,
    });
  typia.assert<IShoppingMallAdminProfile>(fetchedProfileAgain);

  TestValidator.equals(
    "re-fetched profile matches first fetched profile",
    fetchedProfileAgain,
    fetchedProfile,
  );
}
