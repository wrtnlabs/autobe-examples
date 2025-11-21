import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";

export async function test_api_order_delete_nonexistent_by_admin(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as admin to obtain token
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "P@ssw0rd123!",
        first_name: RandomGenerator.name(),
        last_name: RandomGenerator.name(),
        role: "super_admin",
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(admin);

  // Step 2: Attempt to delete a non-existent order with invalid order number
  // Use a valid UUID format pattern but ensure it doesn't exist in system
  const nonExistentOrderNumber = `ORD-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, "0")}${String(new Date().getDate()).padStart(2, "0")}-${RandomGenerator.alphaNumeric(5)}`;

  // Verify that deletion of non-existent order fails with appropriate error
  // This is a business logic error handled by the API, not a type error
  await TestValidator.error("Cannot delete non-existent order", async () => {
    await api.functional.shoppingMall.admin.orders.erase(connection, {
      orderNumber: nonExistentOrderNumber,
    });
  });

  // Step 3: Verify authentication context was not corrupted
  // Since the error is an HTTP 404 (not found) which shouldn't affect auth state
  // we can make a simple authenticated call to verify the connection is still usable
  const authenticatedCheck = await api.functional.auth.admin.join(connection, {
    body: {
      email: admin.email,
      password: "P@ssw0rd123!",
      first_name: RandomGenerator.name(),
      last_name: RandomGenerator.name(),
      role: "super_admin",
    } satisfies IShoppingMallAdmin.ICreate,
  });
  typia.assert(authenticatedCheck);
}
