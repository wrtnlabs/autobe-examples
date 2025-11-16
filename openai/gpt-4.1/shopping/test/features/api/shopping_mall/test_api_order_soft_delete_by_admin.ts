import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";

/**
 * Test soft deletion of a shopping mall order by an administrator.
 *
 * 1. Register a new platform admin using random credentials (email, password,
 *    name) and authenticate.
 * 2. Generate a random order number and attempt to soft delete (erase) it as admin
 *    (success path, no error).
 * 3. Attempt to soft delete a completely new random (non-existent) order number as
 *    admin and expect an error.
 * 4. Re-attempt deletion of the same order number and expect an 'already deleted'
 *    error response.
 *
 * Error assertions only check that an error is thrown. All credentials and
 * order numbers must use typia/RandomGenerator tools. No creation/query of real
 * orders is possible with available APIs.
 */
export async function test_api_order_soft_delete_by_admin(
  connection: api.IConnection,
) {
  // 1. Register admin
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12) + "!A1",
      name: RandomGenerator.name(),
    } satisfies IShoppingMallAdmin.ICreate,
  });
  typia.assert(admin);

  // 2. Soft delete random order number as admin (success path or no error)
  const orderNumber = RandomGenerator.alphaNumeric(14);
  await api.functional.shoppingMall.admin.orders.erase(connection, {
    orderNumber,
  });

  // 3. Attempt to delete random non-existent order (should throw error)
  const nonExistentOrderNumber = RandomGenerator.alphaNumeric(14);
  await TestValidator.error(
    "should throw error on deleting non-existent order",
    async () => {
      await api.functional.shoppingMall.admin.orders.erase(connection, {
        orderNumber: nonExistentOrderNumber,
      });
    },
  );

  // 4. Attempt to delete the same order again (should throw already-deleted error)
  await TestValidator.error(
    "should throw error on already-deleted order",
    async () => {
      await api.functional.shoppingMall.admin.orders.erase(connection, {
        orderNumber,
      });
    },
  );
}
