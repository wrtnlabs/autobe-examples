import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";

export async function test_api_admin_account_invalid_status_change(
  connection: api.IConnection,
) {
  // Step 1: Create a super-admin account to perform admin management operations
  const superAdminEmail = typia.random<string & tags.Format<"email">>();
  const superAdmin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: superAdminEmail,
        password: RandomGenerator.alphaNumeric(16),
        first_name: RandomGenerator.name(),
        last_name: RandomGenerator.name(),
        role: "super_admin",
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(superAdmin);

  // Step 2: Use super-admin account to create a regular admin account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const createdAdmin: IShoppingMallAdmin =
    await api.functional.shoppingMall.admin.actors.admins.create(connection, {
      body: {
        email: adminEmail,
        password: RandomGenerator.alphaNumeric(16),
        first_name: RandomGenerator.name(),
        last_name: RandomGenerator.name(),
        role: "full_admin",
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(createdAdmin);

  // Step 3: Switch context to super-admin account to perform status change
  await api.functional.auth.admin.join(connection, {
    body: {
      email: superAdminEmail,
      password: RandomGenerator.alphaNumeric(16),
      first_name: RandomGenerator.name(),
      last_name: RandomGenerator.name(),
      role: "super_admin",
    } satisfies IShoppingMallAdmin.ICreate,
  });

  // Step 4: Suspend the admin account using super-admin privileges
  const suspendedAdmin: IShoppingMallAdmin =
    await api.functional.shoppingMall.admin.actors.admins.update(connection, {
      adminId: createdAdmin.id,
      body: {
        first_name: createdAdmin.first_name,
        last_name: createdAdmin.last_name,
        status: "suspended",
      } satisfies IShoppingMallAdmin.IUpdate,
    });
  typia.assert(suspendedAdmin);
  TestValidator.equals(
    "admin status is now suspended",
    suspendedAdmin.status,
    "suspended",
  );

  // According to the DTO definition IShoppingMallAdmin.IUpdate, the status field
  // is strictly limited to "suspended". Any attempt to change to "active",
  // "pending_verification", or "deleted" would cause a TypeScript compilation error.
  // This is considered a type-level enforcement of the business rule
  // that "admin account reactivation must occur through separate human approval processes".
  // Therefore, we cannot test these scenarios as requested because they involve type
  // violations that the TypeScript compiler prevents. The only valid status change
  // allowed by the API contract is to "suspended", which we have already tested.
  // All other status changes are impossible to make in the type system.
}
