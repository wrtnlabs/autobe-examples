import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallAdminProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminProfile";

/**
 * Validate that an authenticated administrator can successfully update their
 * own profile.
 *
 * Business context:
 *
 * - Admins register via POST /auth/admin/join and receive an
 *   IShoppingMallAdmin.IAuthorized payload.
 * - The join endpoint also establishes the authentication context by setting the
 *   Authorization header.
 * - Admin profile data is stored in shopping_mall_admin_profiles and managed via
 *   PUT /shoppingMall/admin/admins/{adminId}/profile using
 *   IShoppingMallAdminProfile.IUpdate.
 *
 * Steps:
 *
 * 1. Join as a new admin to obtain an authorized admin context.
 * 2. Use the authorized admin's id as adminId to update their own profile.
 * 3. Send a profile update containing non-null full_name and phone_number values.
 * 4. Verify that the response reflects the updated values and is linked to the
 *    correct admin.
 * 5. Confirm that updated_at has changed relative to created_at to indicate an
 *    update occurred.
 */
export async function test_api_admin_profile_update_self_success(
  connection: api.IConnection,
) {
  // 1. Register a new admin and obtain authorization context
  const joinBody = typia.random<IShoppingMallAdminJoin.ICreate>();
  const authorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: joinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(authorized);

  const adminId = authorized.id;

  // 2. Prepare profile update payload with non-null values
  const updateBody = {
    full_name: "Alice Admin",
    phone_number: RandomGenerator.mobile(),
  } satisfies IShoppingMallAdminProfile.IUpdate;

  // 3. Call profile update endpoint for the same admin
  const profile: IShoppingMallAdminProfile =
    await api.functional.shoppingMall.admin.admins.profile.update(connection, {
      adminId,
      body: updateBody,
    });
  typia.assert<IShoppingMallAdminProfile>(profile);

  // 4. Validate returned profile matches update payload
  TestValidator.equals(
    "updated full_name should match request body",
    profile.full_name,
    updateBody.full_name,
  );
  TestValidator.equals(
    "updated phone_number should match request body",
    profile.phone_number,
    updateBody.phone_number,
  );

  // 5. Validate ownership and timestamps
  TestValidator.equals(
    "profile should belong to the authorized admin",
    profile.shopping_mall_admin_id,
    adminId,
  );

  TestValidator.notEquals(
    "updated_at should differ from created_at after update",
    profile.updated_at,
    profile.created_at,
  );
}
