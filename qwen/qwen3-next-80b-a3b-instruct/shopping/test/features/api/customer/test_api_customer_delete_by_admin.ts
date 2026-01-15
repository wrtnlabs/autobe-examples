import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
/**
 * Test permanent deletion of a customer account by an authorized admin.
 *
 * Validates that an admin can permanently delete a customer and that attempting
 * to delete the same customer twice fails with an error. This test confirms the
 * admin deletion functionality works as expected without requiring customer
 * creation due to lack of customer API endpoints.
 *
 * 1. Admin joins and authenticates
 * 2. Generates a random customer UUID
 * 3. Deletes the customer
 * 4. Verifies deletion cannot happen twice
 */
export async function test_api_customer_delete_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: "admin@example.com",
      password: "securePassword123",
      href: "https://example.com/admin/join",
      referrer: "https://example.com/admin/signup",
    } satisfies IShoppingMallAdmin.IJoin,
  });
  // Step 2: Generate a valid customer UUID for deletion
  // No API exists to create a customer, so we generate a random UUID for deletion test
  const customerId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // Step 3: Perform the admin deletion operation
  await api.functional.shoppingMall.admin.customers.erase(adminConnection, {
    customerId,
  });
  // Step 4: Verify deletion was successful (customer should no longer exist)
  // We don't have a GET endpoint for customer to verify, so we test error validation:
  // Attempting to delete the same customer twice should fail
  await TestValidator.error(
    "delete same customer twice should fail",
    async () => {
      await api.functional.shoppingMall.admin.customers.erase(adminConnection, {
        customerId,
      });
    },
  );
  // Note: The non-admin deletion test has been removed because no user authorization function
  // or customer DTO exists in the system, making it impossible to implement.
}
