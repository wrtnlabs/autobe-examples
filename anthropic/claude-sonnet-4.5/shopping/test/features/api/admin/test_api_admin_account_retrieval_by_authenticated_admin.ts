import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";

/**
 * Test authenticated administrator retrieval of specific admin account details.
 *
 * This test validates the complete workflow where an authenticated
 * administrator successfully retrieves detailed information about another admin
 * account by their unique identifier. The test ensures proper authorization
 * enforcement, correct data retrieval, and appropriate security filtering of
 * sensitive fields.
 *
 * Workflow Steps:
 *
 * 1. Create and authenticate the first admin account (the requesting admin)
 * 2. Create a second admin account (the target to be retrieved)
 * 3. Retrieve the target admin's information using the authenticated admin
 * 4. Validate the response contains complete profile data matching the target
 *    admin
 */
export async function test_api_admin_account_retrieval_by_authenticated_admin(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate the first admin account
  const requestingAdminEmail = typia.random<string & tags.Format<"email">>();
  const requestingAdminPassword = typia.random<
    string & tags.Format<"password">
  >();

  const requestingAdmin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: requestingAdminEmail,
        password: requestingAdminPassword,
        full_name: RandomGenerator.name(),
        phone_number: RandomGenerator.mobile(),
        admin_level: RandomGenerator.pick([
          "super_admin",
          "moderator",
          "support",
        ] as const),
        email_verified: true,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(requestingAdmin);

  // Step 2: Create a second admin account (target for retrieval)
  const targetAdminEmail = typia.random<string & tags.Format<"email">>();
  const targetAdminPassword = typia.random<string & tags.Format<"password">>();
  const targetAdminFullName = RandomGenerator.name();
  const targetAdminPhone = RandomGenerator.mobile();
  const targetAdminLevel = RandomGenerator.pick([
    "super_admin",
    "moderator",
    "support",
  ] as const);

  const targetAdmin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: targetAdminEmail,
        password: targetAdminPassword,
        full_name: targetAdminFullName,
        phone_number: targetAdminPhone,
        admin_level: targetAdminLevel,
        email_verified: true,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(targetAdmin);

  // Step 3: Retrieve the target admin's detailed information
  const retrievedAdmin: IShoppingMallAdmin =
    await api.functional.shoppingMall.admin.admins.at(connection, {
      adminId: targetAdmin.id,
    });
  typia.assert(retrievedAdmin);

  // Step 4: Validate the response contains correct admin data
  TestValidator.equals(
    "retrieved admin ID matches target",
    retrievedAdmin.id,
    targetAdmin.id,
  );
  TestValidator.equals(
    "retrieved admin email matches target",
    retrievedAdmin.email,
    targetAdminEmail,
  );
  TestValidator.equals(
    "retrieved admin full_name matches target",
    retrievedAdmin.full_name,
    targetAdminFullName,
  );
  TestValidator.equals(
    "retrieved admin phone_number matches target",
    retrievedAdmin.phone_number,
    targetAdminPhone,
  );
  TestValidator.equals(
    "retrieved admin admin_level matches target",
    retrievedAdmin.admin_level,
    targetAdminLevel,
  );
  TestValidator.equals(
    "retrieved admin email_verified status matches",
    retrievedAdmin.email_verified,
    true,
  );
  TestValidator.equals(
    "deleted_at is null for active account",
    retrievedAdmin.deleted_at,
    null,
  );
}
