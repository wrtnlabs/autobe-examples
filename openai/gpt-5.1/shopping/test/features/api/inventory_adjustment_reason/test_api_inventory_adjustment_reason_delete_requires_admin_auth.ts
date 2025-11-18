import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallInventoryAdjustmentReason } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryAdjustmentReason";

/**
 * Ensure that deleting inventory adjustment reasons requires admin
 * authentication and that a properly authenticated admin can successfully
 * delete.
 *
 * Business purpose:
 *
 * - Protects inventory adjustment reason master data from anonymous deletion.
 * - Verifies that admin join/login wiring correctly populates Authorization
 *   header used by subsequent admin-only endpoints.
 * - Confirms that DELETE
 *   /shoppingMall/admin/inventoryAdjustmentReasons/{reasonCode} behaves as an
 *   admin-only catalog maintenance operation.
 *
 * Test steps:
 *
 * 1. Construct an unauthenticated connection object that has an empty headers map
 *    so it carries no Authorization token.
 * 2. With that unauthenticated connection, attempt to call
 *    api.functional.shoppingMall.admin.inventoryAdjustmentReasons.erase using a
 *    random reasonCode and assert that the call results in an HTTP error via
 *    TestValidator.error(). This demonstrates anonymous access is rejected.
 * 3. Using the original authenticated-capable connection, call
 *    api.functional.auth.admin.join with a realistic
 *    IShoppingMallAdminJoin.ICreate payload (random email, password format,
 *    href/referrer URLs). typia.assert the returned
 *    IShoppingMallAdmin.IAuthorized to ensure type correctness. The join SDK
 *    will automatically put the admin access token into
 *    connection.headers.Authorization.
 * 4. With the now-authenticated admin connection, call
 *    api.functional.shoppingMall.admin.inventoryAdjustmentReasons.create with a
 *    concrete IShoppingMallInventoryAdjustmentReason.ICreate body (unique code,
 *    name, optional description, direction, is_system_managed=false). Assert
 *    the response shape using typia.assert and retain the returned object.
 * 5. Call api.functional.shoppingMall.admin.inventoryAdjustmentReasons.erase again
 *    on the same connection, passing the created reason.code as reasonCode.
 *    This call should succeed without throwing, proving an admin can delete.
 * 6. Use TestValidator.predicate with descriptive titles to assert that no error
 *    was thrown in the authorized delete path (implicitly by control flow) and
 *    optionally that the reasonCode used for deletion matches the created one.
 */
export async function test_api_inventory_adjustment_reason_delete_requires_admin_auth(
  connection: api.IConnection,
) {
  // 1. Prepare an unauthenticated connection by cloning and clearing headers
  const unauthenticated: api.IConnection = { ...connection, headers: {} };

  // 2. Anonymous delete attempt must fail
  await TestValidator.error(
    "anonymous delete of inventory adjustment reason must fail",
    async () => {
      await api.functional.shoppingMall.admin.inventoryAdjustmentReasons.erase(
        unauthenticated,
        {
          reasonCode: RandomGenerator.alphaNumeric(12),
        },
      );
    },
  );

  // 3. Register an admin, which also wires Authorization header into `connection`
  const adminJoinBody = {
    email: `${RandomGenerator.alphaNumeric(12)}@example.com`,
    password: RandomGenerator.alphaNumeric(16),
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 4. Create a concrete inventory adjustment reason as this admin
  const reasonCreateBody = {
    code: `ADJ_${RandomGenerator.alphaNumeric(8)}`,
    name: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    direction: RandomGenerator.pick([
      "increase",
      "decrease",
      "neutral",
    ] as const),
    is_system_managed: false,
  } satisfies IShoppingMallInventoryAdjustmentReason.ICreate;

  const createdReason: IShoppingMallInventoryAdjustmentReason =
    await api.functional.shoppingMall.admin.inventoryAdjustmentReasons.create(
      connection,
      {
        body: reasonCreateBody,
      },
    );
  typia.assert(createdReason);

  TestValidator.predicate(
    "created reason code should equal requested code",
    createdReason.code === reasonCreateBody.code,
  );

  // 5. Authorized delete attempt must succeed without throwing
  await api.functional.shoppingMall.admin.inventoryAdjustmentReasons.erase(
    connection,
    {
      reasonCode: createdReason.code,
    },
  );

  TestValidator.predicate(
    "authorized admin delete path completed without throwing",
    true,
  );
}
