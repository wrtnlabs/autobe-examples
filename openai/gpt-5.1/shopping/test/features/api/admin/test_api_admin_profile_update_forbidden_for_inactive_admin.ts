import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallAdminProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminProfile";

/**
 * Validate that admin profile updates are restricted to the owning admin and
 * that cross-admin profile modifications are forbidden.
 *
 * Business intent:
 *
 * - An administrator should be able to update their own profile information (full
 *   name, phone number) via PUT /shoppingMall/admin/admins/{adminId}/profile.
 * - An administrator must NOT be able to update another administrator's profile,
 *   even when authenticated as a valid admin.
 *
 * Scenario steps:
 *
 * 1. Join as Admin A using POST /auth/admin/join and obtain A's id.
 * 2. Fetch Admin A's profile via GET /shoppingMall/admin/admins/{adminId}/profile
 *    and validate identity consistency.
 * 3. Update Admin A's profile via PUT /shoppingMall/admin/admins/{adminId}/profile
 *    with new full_name and phone_number and verify the changes.
 * 4. Create Admin B on a separate connection so that the main connection remains
 *    authenticated as Admin A.
 * 5. While still authenticated as Admin A, attempt to update Admin B's profile and
 *    assert that this operation fails.
 * 6. Verify that Admin B's profile has not been modified by the failed cross-admin
 *    update attempt.
 */
export async function test_api_admin_profile_update_forbidden_for_inactive_admin(
  connection: api.IConnection,
) {
  // 1. Admin A joins and becomes authenticated on the main connection
  const adminAJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAAuth: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminAJoinBody,
    });
  typia.assert(adminAAuth);

  // 2. Fetch Admin A profile and validate identity consistency
  const adminAProfileBefore: IShoppingMallAdminProfile =
    await api.functional.shoppingMall.admin.admins.profile.at(connection, {
      adminId: adminAAuth.id,
    });
  typia.assert(adminAProfileBefore);

  TestValidator.equals(
    "admin A profile admin id matches authorized admin id",
    adminAProfileBefore.shopping_mall_admin_id,
    adminAAuth.id,
  );

  // 3. Update Admin A profile with new values
  const updatedFullNameA: string = RandomGenerator.name();
  const updatedPhoneA: string = RandomGenerator.mobile();

  const adminAUpdateBody = {
    full_name: updatedFullNameA,
    phone_number: updatedPhoneA,
  } satisfies IShoppingMallAdminProfile.IUpdate;

  const adminAProfileAfterUpdate: IShoppingMallAdminProfile =
    await api.functional.shoppingMall.admin.admins.profile.update(connection, {
      adminId: adminAAuth.id,
      body: adminAUpdateBody,
    });
  typia.assert(adminAProfileAfterUpdate);

  TestValidator.equals(
    "admin A profile id remains stable after update",
    adminAProfileAfterUpdate.id,
    adminAProfileBefore.id,
  );
  TestValidator.equals(
    "admin A full_name updated correctly",
    adminAProfileAfterUpdate.full_name,
    updatedFullNameA,
  );
  TestValidator.equals(
    "admin A phone_number updated correctly",
    adminAProfileAfterUpdate.phone_number,
    updatedPhoneA,
  );

  // 4. Create Admin B on a separate connection to keep main connection as Admin A
  const connectionForAdminB: api.IConnection = {
    ...connection,
  };

  const adminBJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminBAuth: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connectionForAdminB, {
      body: adminBJoinBody,
    });
  typia.assert(adminBAuth);

  // Fetch Admin B profile in its own authenticated context for later comparison
  const adminBProfileBefore: IShoppingMallAdminProfile =
    await api.functional.shoppingMall.admin.admins.profile.at(
      connectionForAdminB,
      {
        adminId: adminBAuth.id,
      },
    );
  typia.assert(adminBProfileBefore);

  TestValidator.equals(
    "admin B profile admin id matches authorized admin B id",
    adminBProfileBefore.shopping_mall_admin_id,
    adminBAuth.id,
  );

  // 5. While authenticated as Admin A on the main connection,
  //    attempt to update Admin B's profile. This should be forbidden.
  const forbiddenFullNameForB: string = RandomGenerator.name();
  const forbiddenPhoneForB: string = RandomGenerator.mobile();

  const crossAdminUpdateBody = {
    full_name: forbiddenFullNameForB,
    phone_number: forbiddenPhoneForB,
  } satisfies IShoppingMallAdminProfile.IUpdate;

  await TestValidator.error(
    "admin A attempting to update admin B profile must fail",
    async () => {
      await api.functional.shoppingMall.admin.admins.profile.update(
        connection,
        {
          adminId: adminBAuth.id,
          body: crossAdminUpdateBody,
        },
      );
    },
  );

  // 6. Verify that Admin B's profile has not been modified by the failed attempt
  const adminBProfileAfter: IShoppingMallAdminProfile =
    await api.functional.shoppingMall.admin.admins.profile.at(
      connectionForAdminB,
      {
        adminId: adminBAuth.id,
      },
    );
  typia.assert(adminBProfileAfter);

  TestValidator.equals(
    "admin B profile id remains the same after forbidden update attempt",
    adminBProfileAfter.id,
    adminBProfileBefore.id,
  );

  TestValidator.equals(
    "admin B full_name is unchanged after forbidden update attempt",
    adminBProfileAfter.full_name,
    adminBProfileBefore.full_name,
  );

  TestValidator.equals(
    "admin B phone_number is unchanged after forbidden update attempt",
    adminBProfileAfter.phone_number,
    adminBProfileBefore.phone_number,
  );
}
