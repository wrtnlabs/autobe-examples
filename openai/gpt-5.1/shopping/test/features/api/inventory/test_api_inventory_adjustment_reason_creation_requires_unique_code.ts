import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallInventoryAdjustmentReason } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryAdjustmentReason";

/**
 * Validate that inventory adjustment reason creation enforces unique `code`
 * values.
 *
 * Business context: Inventory adjustment reasons are master data entries
 * identified by a stable `code` field. The backend enforces a unique index on
 * this `code` to prevent duplicate configuration entries that could confuse
 * reporting and reconciliation logic. Administrative actors manage these
 * reasons through the /shoppingMall/admin/inventoryAdjustmentReasons endpoint.
 *
 * This test ensures that when an admin attempts to create two reasons with the
 * same `code`, the first creation succeeds but the second fails with a client
 * error, proving that the unique index on `code` is correctly enforced at the
 * API level.
 *
 * Steps:
 *
 * 1. Register an admin using POST /auth/admin/join and obtain an authenticated
 *    admin context via api.functional.auth.admin.join. The SDK will wire the
 *    Authorization header into the shared `connection`.
 * 2. Call POST /shoppingMall/admin/inventoryAdjustmentReasons with payload A using
 *    a fixed `code` (e.g., "DUPLICATE_CODE"), a random but valid `name`,
 *    optional `description`, some `direction` value, and an `is_system_managed`
 *    flag. Assert that the call succeeds and returns an
 *    `IShoppingMallInventoryAdjustmentReason` whose `code` matches the input.
 * 3. Call the same create endpoint again with payload B that reuses the same
 *    `code` but varies other fields (like `name` and `description`). Wrap this
 *    call in `TestValidator.error` to assert that it fails, indicating a
 *    duplicate `code` violation.
 * 4. Do not check specific HTTP status codes or error messages; only verify that
 *    an error is thrown for the second request.
 *
 * Constraints and notes:
 *
 * - Use `IShoppingMallAdminJoin.ICreate` for the join request body and
 *   `IShoppingMallAdmin.IAuthorized` for the join response type.
 * - Use `IShoppingMallInventoryAdjustmentReason.ICreate` for request bodies and
 *   `IShoppingMallInventoryAdjustmentReason` for the successful response type.
 * - Never manipulate `connection.headers` directly in this test; rely on the side
 *   effects of `api.functional.auth.admin.join` to manage auth tokens.
 * - Use `typia.random` and `RandomGenerator` to generate realistic test values
 *   where appropriate, but use a constant string for the duplicate `code` so
 *   that the uniqueness constraint is clearly exercised.
 * - Use `TestValidator.equals` and `TestValidator.error` with descriptive title
 *   strings for all assertions.
 */
export async function test_api_inventory_adjustment_reason_creation_requires_unique_code(
  connection: api.IConnection,
) {
  // 1. Register an admin and obtain authenticated context
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuthorized);

  // 2. First creation with a unique code should succeed
  const duplicateCode = "DUPLICATE_CODE";

  const firstCreateBody = {
    code: duplicateCode,
    name: RandomGenerator.paragraph({ sentences: 3, wordMin: 3, wordMax: 10 }),
    description: RandomGenerator.paragraph({
      sentences: 5,
      wordMin: 3,
      wordMax: 12,
    }),
    direction: "increase",
    is_system_managed: false,
  } satisfies IShoppingMallInventoryAdjustmentReason.ICreate;

  const firstReason: IShoppingMallInventoryAdjustmentReason =
    await api.functional.shoppingMall.admin.inventoryAdjustmentReasons.create(
      connection,
      {
        body: firstCreateBody,
      },
    );
  typia.assert<IShoppingMallInventoryAdjustmentReason>(firstReason);

  TestValidator.equals(
    "first inventory adjustment reason code matches input",
    firstReason.code,
    duplicateCode,
  );

  // 3. Second creation with the same code must fail
  const secondCreateBody = {
    code: duplicateCode,
    name: RandomGenerator.paragraph({ sentences: 2, wordMin: 4, wordMax: 8 }),
    description: RandomGenerator.paragraph({
      sentences: 4,
      wordMin: 3,
      wordMax: 10,
    }),
    direction: "increase",
    is_system_managed: true,
  } satisfies IShoppingMallInventoryAdjustmentReason.ICreate;

  await TestValidator.error(
    "creating inventory adjustment reason with duplicate code must fail",
    async () => {
      await api.functional.shoppingMall.admin.inventoryAdjustmentReasons.create(
        connection,
        {
          body: secondCreateBody,
        },
      );
    },
  );
}
