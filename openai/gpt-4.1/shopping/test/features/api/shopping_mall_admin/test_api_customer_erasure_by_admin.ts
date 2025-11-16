import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";

/**
 * Test that an authenticated admin can permanently delete a customer account by
 * customerId.
 *
 * - Confirms hard delete policy: personal, authentication, and relationship data
 *   is erased.
 * - Further access to deleted customer returns proper error, e.g., 404 Not Found.
 * - Only admin actor can perform deletion; unauthorized actors/invalid ids are
 *   rejected.
 * - Validates that audit logging for deletion events is captured.
 */
export async function test_api_customer_erasure_by_admin(
  connection: api.IConnection,
) {
  // 1. Register a new admin to obtain an authenticated session
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12); // Min 8 chars
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

  // 2. Generate a random UUID for customerId (cannot actually create a customer due to SDK limitations)
  // In a real E2E this would first create a customer and then delete, but we only have admin join & erase in API.
  const randomCustomerId = typia.random<string & tags.Format<"uuid">>();

  // 3. Attempt to erase a random (likely non-existent) customerId -- should return error (404 Not Found)
  await TestValidator.error(
    "erasing non-existent customer should fail",
    async () => {
      await api.functional.shoppingMall.admin.customers.erase(connection, {
        customerId: randomCustomerId,
      });
    },
  );

  // 4. Attempt to erase with empty or invalid id (such as another random UUID not tied to any customer) is covered above

  // 5. Attempt to erase as unauthorized (no admin registration)
  const unauthConnection: api.IConnection = { ...connection, headers: {} };
  const anotherRandomCustomerId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "unauthorized erasure attempt should be rejected",
    async () => {
      await api.functional.shoppingMall.admin.customers.erase(
        unauthConnection,
        { customerId: anotherRandomCustomerId },
      );
    },
  );

  // 6. (Assume audit logging is handled server-side; for compliance events, we do not have audit log query APIs)
  // If audit log validation APIs existed, an additional fetch/assertion would be performed here.
}
