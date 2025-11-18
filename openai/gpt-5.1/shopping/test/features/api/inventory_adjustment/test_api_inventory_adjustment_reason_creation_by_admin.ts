import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallInventoryAdjustmentReason } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryAdjustmentReason";

/**
 * Validate that an authenticated admin can create an inventory adjustment
 * reason and that authentication is required.
 *
 * Business flow:
 *
 * 1. Register a new admin via POST /auth/admin/join using
 *    IShoppingMallAdminJoin.ICreate.
 *
 *    - This should return IShoppingMallAdmin.IAuthorized and automatically attach
 *         the access token to `connection.headers.Authorization`.
 * 2. Using the authenticated connection, call POST
 *    /shoppingMall/admin/inventoryAdjustmentReasons via
 *    api.functional.shoppingMall.admin.inventoryAdjustmentReasons.create with a
 *    well-formed IShoppingMallInventoryAdjustmentReason.ICreate body
 *    containing:
 *
 *    - Code: stable business key like "STOCK_CORRECTION_..." (unique per test)
 *    - Name: human-readable label
 *    - Description: optional explanatory text
 *    - Direction: business direction string such as "increase" or "decrease"
 *    - Is_system_managed: false (admin-managed reason)
 * 3. Assert that the response is a valid IShoppingMallInventoryAdjustmentReason
 *    using typia.assert and that:
 *
 *    - Id is a UUID format string (guaranteed by typia.assert)
 *    - Code, name, direction, and is_system_managed echo the request
 *    - Description matches the request (string or null)
 *    - Created_at and updated_at are populated date-time strings
 *    - Deleted_at is null or undefined (active record).
 * 4. Prove that admin authentication is required:
 *
 *    - Create a separate unauthenticated connection object where headers are omitted
 *         (do not mutate the original connection.headers directly).
 *    - Call the same create endpoint with valid payload and expect it to fail,
 *         wrapping the call with TestValidator.error.
 */
export async function test_api_inventory_adjustment_reason_creation_by_admin(
  connection: api.IConnection,
) {
  // 1. Admin join to obtain authenticated context
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized = await api.functional.auth.admin.join(connection, {
    body: adminJoinBody,
  });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuthorized);

  // 2. Create a new inventory adjustment reason as authenticated admin
  const uniqueSuffix = RandomGenerator.alphaNumeric(8).toUpperCase();
  const createBody = {
    code: `STOCK_CORRECTION_${uniqueSuffix}`,
    name: `Stock correction reason ${uniqueSuffix}`,
    description: RandomGenerator.paragraph({ sentences: 5 }),
    direction: "decrease",
    is_system_managed: false,
  } satisfies IShoppingMallInventoryAdjustmentReason.ICreate;

  const createdReason =
    await api.functional.shoppingMall.admin.inventoryAdjustmentReasons.create(
      connection,
      {
        body: createBody,
      },
    );
  typia.assert<IShoppingMallInventoryAdjustmentReason>(createdReason);

  // 3. Validate response fields against request
  TestValidator.equals(
    "created reason code should echo request code",
    createdReason.code,
    createBody.code,
  );
  TestValidator.equals(
    "created reason name should echo request name",
    createdReason.name,
    createBody.name,
  );
  TestValidator.equals(
    "created reason direction should echo request direction",
    createdReason.direction,
    createBody.direction,
  );
  TestValidator.equals(
    "created reason is_system_managed should echo request flag",
    createdReason.is_system_managed,
    createBody.is_system_managed,
  );
  TestValidator.equals(
    "created reason description should echo request description",
    createdReason.description ?? null,
    createBody.description ?? null,
  );

  // created_at and updated_at are validated structurally by typia.assert
  TestValidator.predicate(
    "created_at should be defined",
    createdReason.created_at !== null && createdReason.created_at !== undefined,
  );
  TestValidator.predicate(
    "updated_at should be defined",
    createdReason.updated_at !== null && createdReason.updated_at !== undefined,
  );
  TestValidator.equals(
    "deleted_at should be null or undefined for active record",
    createdReason.deleted_at ?? null,
    null,
  );

  // 4. Verify that authentication is required by calling with an unauthenticated connection
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  const unauthenticatedBody = {
    code: `UNAUTH_TEST_${uniqueSuffix}`,
    name: `Unauth inventory reason ${uniqueSuffix}`,
    description: RandomGenerator.paragraph({ sentences: 3 }),
    direction: "increase",
    is_system_managed: false,
  } satisfies IShoppingMallInventoryAdjustmentReason.ICreate;

  await TestValidator.error(
    "unauthenticated admin cannot create inventory adjustment reason",
    async () => {
      await api.functional.shoppingMall.admin.inventoryAdjustmentReasons.create(
        unauthenticatedConnection,
        {
          body: unauthenticatedBody,
        },
      );
    },
  );
}
