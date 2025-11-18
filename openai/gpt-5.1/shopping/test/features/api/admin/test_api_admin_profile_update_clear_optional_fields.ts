import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallAdminProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminProfile";

/**
 * Validate clearing optional admin profile fields via explicit null updates.
 *
 * Business goal: Ensure that an authenticated admin can first populate their
 * profile with non-null values for optional fields (full_name, phone_number)
 * and then clear those fields by sending them explicitly as null in a
 * subsequent update request. This validates the partial-update semantics
 * described in IShoppingMallAdminProfile.IUpdate: omitting a field keeps the
 * stored value unchanged, while providing null clears it.
 *
 * Scenario steps:
 *
 * 1. Join as a new admin via POST /auth/admin/join, receiving
 *    IShoppingMallAdmin.IAuthorized and letting the SDK set the Authorization
 *    header on the connection.
 * 2. Immediately call PUT /shoppingMall/admin/admins/{adminId}/profile with
 *    non-null values for full_name and phone_number to seed initial profile
 *    data.
 * 3. Verify the first update response is a valid IShoppingMallAdminProfile and
 *    that full_name and phone_number match the seeded values.
 * 4. Call the same profile.update again for the same adminId, but this time send
 *    an IShoppingMallAdminProfile.IUpdate body where both full_name and
 *    phone_number are explicitly null (properties present with null values, not
 *    omitted).
 * 5. Verify the second response is a valid IShoppingMallAdminProfile, with
 *    full_name and phone_number now null, created_at unchanged, and updated_at
 *    changed from the first response.
 *
 * This test confirms that admins can remove previously stored personal details
 * from their profiles without affecting immutable metadata, and that the
 * profile update endpoint correctly distinguishes between omission and explicit
 * null for optional fields.
 */
export async function test_api_admin_profile_update_clear_optional_fields(
  connection: api.IConnection,
) {
  // 1. Join as a new admin and obtain authorized context
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const authorizedAdmin = await api.functional.auth.admin.join(connection, {
    body: joinBody,
  });
  typia.assert<IShoppingMallAdmin.IAuthorized>(authorizedAdmin);

  const adminId = authorizedAdmin.id;

  // 2. Seed initial non-null profile data
  const initialFullName = "Admin Full Name";
  const initialPhoneNumber = RandomGenerator.mobile();

  const firstProfile =
    await api.functional.shoppingMall.admin.admins.profile.update(connection, {
      adminId,
      body: {
        full_name: initialFullName,
        phone_number: initialPhoneNumber,
      } satisfies IShoppingMallAdminProfile.IUpdate,
    });
  typia.assert<IShoppingMallAdminProfile>(firstProfile);

  // 3. Validate seeded profile values
  TestValidator.equals(
    "initial full_name should match seeded value",
    firstProfile.full_name,
    initialFullName,
  );
  TestValidator.equals(
    "initial phone_number should match seeded value",
    firstProfile.phone_number,
    initialPhoneNumber,
  );

  const firstCreatedAt = firstProfile.created_at;
  const firstUpdatedAt = firstProfile.updated_at;

  // 4. Clear optional fields by explicitly sending null
  const secondProfile =
    await api.functional.shoppingMall.admin.admins.profile.update(connection, {
      adminId,
      body: {
        full_name: null,
        phone_number: null,
      } satisfies IShoppingMallAdminProfile.IUpdate,
    });
  typia.assert<IShoppingMallAdminProfile>(secondProfile);

  // 5. Validate clearing behavior and timestamp semantics
  TestValidator.equals(
    "full_name should be cleared to null",
    secondProfile.full_name,
    null,
  );
  TestValidator.equals(
    "phone_number should be cleared to null",
    secondProfile.phone_number,
    null,
  );

  TestValidator.equals(
    "created_at should remain unchanged after profile updates",
    secondProfile.created_at,
    firstCreatedAt,
  );

  TestValidator.notEquals(
    "updated_at should change after clearing optional fields",
    secondProfile.updated_at,
    firstUpdatedAt,
  );
}
