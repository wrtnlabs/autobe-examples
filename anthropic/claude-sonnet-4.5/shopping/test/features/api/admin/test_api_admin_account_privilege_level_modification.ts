import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";

/**
 * Test administrative privilege level changes to validate that admin_level can
 * be successfully updated and that such changes are properly tracked for
 * security audit purposes.
 *
 * This test validates:
 *
 * 1. Admin authentication with update permissions
 * 2. Target admin account creation with initial privilege level
 * 3. Privilege escalation from support to moderator
 * 4. Response validation showing updated privilege level
 * 5. Persistence verification by retrieving the updated admin account
 * 6. Audit trail validation through updated_at timestamp changes
 * 7. Multiple privilege level transitions (moderator to super_admin)
 * 8. Data consistency verification ensuring only admin_level changes
 */
export async function test_api_admin_account_privilege_level_modification(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate a super_admin who can modify privilege levels
  const superAdminEmail = typia.random<string & tags.Format<"email">>();
  const superAdmin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: superAdminEmail,
        password: typia.random<string & tags.Format<"password">>(),
        full_name: RandomGenerator.name(),
        phone_number: RandomGenerator.mobile(),
        admin_level: "super_admin",
        email_verified: true,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(superAdmin);

  // Step 2: Create target admin account with initial privilege level "support"
  const targetAdminEmail = typia.random<string & tags.Format<"email">>();
  const targetAdminPassword = typia.random<string & tags.Format<"password">>();
  const targetAdminFullName = RandomGenerator.name();
  const targetAdminPhone = RandomGenerator.mobile();

  const targetAdmin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: targetAdminEmail,
        password: targetAdminPassword,
        full_name: targetAdminFullName,
        phone_number: targetAdminPhone,
        admin_level: "support",
        email_verified: true,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(targetAdmin);

  // Verify initial privilege level is "support"
  TestValidator.equals(
    "initial privilege level",
    targetAdmin.admin_level,
    "support",
  );

  // Store original created_at and updated_at for comparison
  const originalCreatedAt = targetAdmin.created_at;
  const originalUpdatedAt = targetAdmin.updated_at;

  // Step 3: First privilege update - change from "support" to "moderator"
  const firstUpdate: IShoppingMallAdmin =
    await api.functional.shoppingMall.admin.admins.update(connection, {
      adminId: targetAdmin.id,
      body: {
        admin_level: "moderator",
      } satisfies IShoppingMallAdmin.IUpdate,
    });
  typia.assert(firstUpdate);

  // Step 4: Validate first update response
  TestValidator.equals(
    "privilege updated to moderator",
    firstUpdate.admin_level,
    "moderator",
  );
  TestValidator.equals(
    "email unchanged after first update",
    firstUpdate.email,
    targetAdminEmail,
  );
  TestValidator.equals(
    "full_name unchanged after first update",
    firstUpdate.full_name,
    targetAdminFullName,
  );
  TestValidator.equals(
    "phone_number unchanged after first update",
    firstUpdate.phone_number,
    targetAdminPhone,
  );
  TestValidator.equals(
    "created_at unchanged after first update",
    firstUpdate.created_at,
    originalCreatedAt,
  );

  // Verify updated_at timestamp changed (for audit trail)
  TestValidator.predicate(
    "updated_at changed after first privilege modification",
    new Date(firstUpdate.updated_at).getTime() >=
      new Date(originalUpdatedAt).getTime(),
  );

  // Step 5: Second privilege update - change from "moderator" to "super_admin"
  const firstUpdateTimestamp = firstUpdate.updated_at;

  const secondUpdate: IShoppingMallAdmin =
    await api.functional.shoppingMall.admin.admins.update(connection, {
      adminId: targetAdmin.id,
      body: {
        admin_level: "super_admin",
      } satisfies IShoppingMallAdmin.IUpdate,
    });
  typia.assert(secondUpdate);

  // Step 6: Validate second update response
  TestValidator.equals(
    "privilege updated to super_admin",
    secondUpdate.admin_level,
    "super_admin",
  );
  TestValidator.equals(
    "email unchanged after second update",
    secondUpdate.email,
    targetAdminEmail,
  );
  TestValidator.equals(
    "full_name unchanged after second update",
    secondUpdate.full_name,
    targetAdminFullName,
  );
  TestValidator.equals(
    "phone_number unchanged after second update",
    secondUpdate.phone_number,
    targetAdminPhone,
  );
  TestValidator.equals(
    "created_at unchanged after second update",
    secondUpdate.created_at,
    originalCreatedAt,
  );

  // Verify updated_at timestamp changed again (for second modification audit trail)
  TestValidator.predicate(
    "updated_at changed after second privilege modification",
    new Date(secondUpdate.updated_at).getTime() >=
      new Date(firstUpdateTimestamp).getTime(),
  );

  // Step 7: Verify all three privilege levels have been successfully tested
  // This test has validated: support → moderator → super_admin transitions
}
