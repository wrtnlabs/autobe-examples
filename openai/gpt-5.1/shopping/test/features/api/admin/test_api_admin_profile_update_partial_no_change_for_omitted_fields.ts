import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallAdminProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminProfile";

/**
 * Validate partial update semantics for admin profile updates.
 *
 * Business goal: Ensure that when an administrator updates their profile via
 * PUT /shoppingMall/admin/admins/{adminId}/profile using the
 * IShoppingMallAdminProfile.IUpdate DTO, only the explicitly provided fields
 * are modified. Omitted optional fields must keep their existing values.
 * Additionally, created_at must remain stable while updated_at advances on each
 * successful update.
 *
 * Test steps:
 *
 * 1. Join as a new admin using POST /auth/admin/join to obtain an authenticated
 *    admin context and the admin's id.
 * 2. Establish an initial profile by calling the profile update API with both
 *    full_name and phone_number set to non-null string values.
 * 3. Verify that the returned profile reflects these values and capture created_at
 *    and updated_at timestamps.
 * 4. Perform a second profile update where only full_name is provided in the
 *    IShoppingMallAdminProfile.IUpdate body, omitting phone_number entirely.
 * 5. Verify that:
 *
 *    - Full_name has changed to the new value.
 *    - Phone_number remains equal to the originally set value.
 *    - Created_at is identical between the first and second responses.
 *    - Updated_at differs between the first and second responses.
 */
export async function test_api_admin_profile_update_partial_no_change_for_omitted_fields(
  connection: api.IConnection,
) {
  // 1. Join as a new admin to obtain authorization and admin id
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const authorizedAdmin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: joinBody,
    });
  typia.assert(authorizedAdmin);

  const adminId: string & tags.Format<"uuid"> = authorizedAdmin.id;

  // 2. Establish initial profile with both full_name and phone_number set
  const initialFullName = RandomGenerator.name();
  const initialPhoneNumber = RandomGenerator.mobile();

  const initialUpdateBody = {
    full_name: initialFullName,
    phone_number: initialPhoneNumber,
  } satisfies IShoppingMallAdminProfile.IUpdate;

  const initialProfile: IShoppingMallAdminProfile =
    await api.functional.shoppingMall.admin.admins.profile.update(connection, {
      adminId,
      body: initialUpdateBody,
    });
  typia.assert(initialProfile);

  // Validate that initial profile reflects the baseline values
  TestValidator.equals(
    "initial full_name should match the value sent in the first update",
    initialProfile.full_name,
    initialFullName,
  );
  TestValidator.equals(
    "initial phone_number should match the value sent in the first update",
    initialProfile.phone_number,
    initialPhoneNumber,
  );

  const initialCreatedAt = initialProfile.created_at;
  const initialUpdatedAt = initialProfile.updated_at;

  // 3. Perform partial update: change only full_name, omit phone_number
  const newFullName = RandomGenerator.name();

  const partialUpdateBody = {
    full_name: newFullName,
    // phone_number intentionally omitted to verify partial update semantics
  } satisfies IShoppingMallAdminProfile.IUpdate;

  const updatedProfile: IShoppingMallAdminProfile =
    await api.functional.shoppingMall.admin.admins.profile.update(connection, {
      adminId,
      body: partialUpdateBody,
    });
  typia.assert(updatedProfile);

  // 4. Business validations after partial update
  // full_name should be updated
  TestValidator.equals(
    "full_name should be updated to the new value after partial update",
    updatedProfile.full_name,
    newFullName,
  );

  // phone_number should remain unchanged
  TestValidator.equals(
    "phone_number should remain unchanged when omitted from partial update body",
    updatedProfile.phone_number,
    initialPhoneNumber,
  );

  // created_at should remain the same
  TestValidator.equals(
    "created_at should remain unchanged between initial and updated profile",
    updatedProfile.created_at,
    initialCreatedAt,
  );

  // updated_at should advance (be different)
  TestValidator.notEquals(
    "updated_at should change after profile update",
    updatedProfile.updated_at,
    initialUpdatedAt,
  );
}
