import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallInventoryAdjustmentReason } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallInventoryAdjustmentReason";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallInventoryAdjustmentReason } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryAdjustmentReason";

/**
 * Validate admin search filtering of inventory adjustment reasons by code.
 *
 * Business context: Administrative users manage a master list of inventory
 * adjustment reasons (such as stock count corrections, damage, shrinkage,
 * etc.). The `/shoppingMall/admin/inventoryAdjustmentReasons` PATCH search
 * endpoint supports filtering these reasons by `code`, which is the stable
 * business key. This test ensures that when an admin filters by `code`, the
 * endpoint returns only matching reasons and does not leak unrelated
 * configuration records.
 *
 * Scenario steps:
 *
 * 1. Join an admin using POST /auth/admin/join to establish an authenticated admin
 *    session and token.
 * 2. Create multiple inventory adjustment reasons via POST
 *    /shoppingMall/admin/inventoryAdjustmentReasons, including a target reason
 *    with a distinct code like `COUNT_CORRECTION_TEST` and at least one other
 *    reason with a clearly different code.
 * 3. Call PATCH /shoppingMall/admin/inventoryAdjustmentReasons with an
 *    IShoppingMallInventoryAdjustmentReason.IRequest body that sets `code` to
 *    the exact target code and `limit` large enough to cover all potential
 *    matches, leaving other filters undefined.
 * 4. Assert the response type and ensure that:
 *
 *    - Every returned summary record has a `code` exactly equal to the filter value.
 *    - The specifically created target reason appears in the result set.
 *    - The non-matching reason is excluded from the results.
 */
export async function test_api_admin_inventory_adjustment_reason_search_filter_by_code(
  connection: api.IConnection,
) {
  // 1. Join an admin to obtain an authenticated context
  const adminJoinBody = {
    email: `admin+${RandomGenerator.alphaNumeric(8)}@example.com`,
    password: "AdminPassword123!",
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Create multiple inventory adjustment reasons
  const targetCode = "COUNT_CORRECTION_TEST";
  const nonMatchingCode = "DAMAGED_STOCK_TEST";

  const createTargetBody = {
    code: targetCode,
    name: "Stock Count Correction (Test)",
    description: RandomGenerator.paragraph({ sentences: 3 }),
    direction: "neutral",
    is_system_managed: false,
  } satisfies IShoppingMallInventoryAdjustmentReason.ICreate;

  const targetReason: IShoppingMallInventoryAdjustmentReason =
    await api.functional.shoppingMall.admin.inventoryAdjustmentReasons.create(
      connection,
      {
        body: createTargetBody,
      },
    );
  typia.assert(targetReason);

  const createOtherBody = {
    code: nonMatchingCode,
    name: "Damaged Stock (Test)",
    description: RandomGenerator.paragraph({ sentences: 3 }),
    direction: "decrease",
    is_system_managed: false,
  } satisfies IShoppingMallInventoryAdjustmentReason.ICreate;

  const otherReason: IShoppingMallInventoryAdjustmentReason =
    await api.functional.shoppingMall.admin.inventoryAdjustmentReasons.create(
      connection,
      {
        body: createOtherBody,
      },
    );
  typia.assert(otherReason);

  // 3. Perform search filtered by exact code
  const requestBody = {
    code: targetCode,
    limit: 10,
  } satisfies IShoppingMallInventoryAdjustmentReason.IRequest;

  const page: IPageIShoppingMallInventoryAdjustmentReason.ISummary =
    await api.functional.shoppingMall.admin.inventoryAdjustmentReasons.index(
      connection,
      {
        body: requestBody,
      },
    );
  typia.assert(page);

  // 4. Business assertions
  TestValidator.predicate(
    "search by code should return at least one result",
    page.pagination.records > 0 && page.data.length > 0,
  );

  for (const summary of page.data) {
    TestValidator.equals(
      "every returned reason must have the requested code",
      summary.code,
      targetCode,
    );
  }

  const hasTarget = page.data.some((summary) => summary.id === targetReason.id);
  TestValidator.predicate(
    "search results must include the specifically created target reason",
    hasTarget,
  );

  const hasOther = page.data.some((summary) => summary.id === otherReason.id);
  TestValidator.predicate(
    "search results must not include reasons with unrelated codes",
    hasOther === false,
  );
}
