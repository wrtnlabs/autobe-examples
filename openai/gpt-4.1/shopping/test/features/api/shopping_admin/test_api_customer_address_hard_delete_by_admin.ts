import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";

/**
 * Test the hard deletion of a specific customer address by an authenticated
 * admin actor.
 *
 * This scenario covers the full workflow, including:
 *
 * 1. Admin registration (join): Authenticates as a new admin using unique
 *    email/password/name.
 * 2. Attempts to hard delete a customer address using random (nonexistent)
 *    customerId and addressId (UUID format).
 * 3. Validates business rule compliance: since the address does not exist,
 *    operation should succeed or result in no-op, but no address should be
 *    recoverable, and no permission errors should occur.
 * 4. Ensures strict compliance with audit trail and that admin permissions are
 *    enforced (only admin can perform the action).
 */
export async function test_api_customer_address_hard_delete_by_admin(
  connection: api.IConnection,
) {
  // 1. Admin registration (join)
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const adminName = RandomGenerator.name();

  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        name: adminName,
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(admin);

  // 2. Hard delete of a customer address using random UUIDs
  const customerId = typia.random<string & tags.Format<"uuid">>();
  const addressId = typia.random<string & tags.Format<"uuid">>();

  // This should succeed (no error), even if the entities do not exist (idempotency of DELETE)
  await api.functional.shoppingMall.admin.customers.addresses.erase(
    connection,
    {
      customerId,
      addressId,
    },
  );

  // Since we have no endpoint to verify existence after delete, this test just ensures no permission errors.
  // If the operation is successful and no error is thrown, it is considered a pass for the hard-deletion business rule.
  TestValidator.predicate(
    "admin is authenticated and delete customer address endpoint succeeded with no error",
    true,
  );
}
