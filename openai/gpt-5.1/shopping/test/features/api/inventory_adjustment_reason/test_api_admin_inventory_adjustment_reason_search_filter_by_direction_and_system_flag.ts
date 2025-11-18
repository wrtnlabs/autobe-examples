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
 * Validate compound filtering of inventory adjustment reasons by direction and
 * system-managed flag.
 *
 * Business goal: Ensure that the administrative search endpoint for inventory
 * adjustment reasons (PATCH /shoppingMall/admin/inventoryAdjustmentReasons)
 * correctly applies combined filters on both the `direction` field and the
 * `is_system_managed` flag, so that operations teams can reliably distinguish
 * between increase vs decrease reasons and system-managed vs admin-managed
 * configuration entries.
 *
 * Test workflow:
 *
 * 1. Register an admin using POST /auth/admin/join to obtain an authenticated
 *    admin session (handled implicitly by the SDK).
 * 2. As that admin, seed three inventory adjustment reasons via POST
 *    /shoppingMall/admin/inventoryAdjustmentReasons:
 *
 *    - Reason A: direction = "increase", is_system_managed = false.
 *    - Reason B: direction = "decrease", is_system_managed = true.
 *    - Reason C: direction = "increase", is_system_managed = true.
 * 3. Invoke PATCH /shoppingMall/admin/inventoryAdjustmentReasons with an
 *    IShoppingMallInventoryAdjustmentReason.IRequest body specifying:
 *
 *    - Page = 1
 *    - Limit = 20 (large enough for all test records)
 *    - Direction = "increase"
 *    - Is_system_managed = false
 *    - Include_deleted = false
 * 4. Verify the response shape as
 *    IPageIShoppingMallInventoryAdjustmentReason.ISummary using typia.assert.
 * 5. Assert using TestValidator that:
 *
 *    - The result set contains the summary for Reason A.
 *    - The result set does not contain summaries for Reason B or Reason C.
 * 6. Perform an additional query with:
 *
 *    - Direction = "decrease"
 *    - Is_system_managed = true
 *    - Include_deleted = false and assert that only Reason B is returned among the
 *         three seeded reasons.
 */
export async function test_api_admin_inventory_adjustment_reason_search_filter_by_direction_and_system_flag(
  connection: api.IConnection,
) {
  // 1. Register an admin to obtain authenticated context.
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Seed three inventory adjustment reasons with distinct direction and
  //    is_system_managed combinations.
  const reasonACreate = {
    code: `A_${RandomGenerator.alphaNumeric(8)}`,
    name: "Reason A - increase non-system",
    description: RandomGenerator.paragraph({ sentences: 4 }),
    direction: "increase",
    is_system_managed: false,
  } satisfies IShoppingMallInventoryAdjustmentReason.ICreate;

  const reasonA: IShoppingMallInventoryAdjustmentReason =
    await api.functional.shoppingMall.admin.inventoryAdjustmentReasons.create(
      connection,
      { body: reasonACreate },
    );
  typia.assert(reasonA);

  const reasonBCreate = {
    code: `B_${RandomGenerator.alphaNumeric(8)}`,
    name: "Reason B - decrease system",
    description: RandomGenerator.paragraph({ sentences: 4 }),
    direction: "decrease",
    is_system_managed: true,
  } satisfies IShoppingMallInventoryAdjustmentReason.ICreate;

  const reasonB: IShoppingMallInventoryAdjustmentReason =
    await api.functional.shoppingMall.admin.inventoryAdjustmentReasons.create(
      connection,
      { body: reasonBCreate },
    );
  typia.assert(reasonB);

  const reasonCCreate = {
    code: `C_${RandomGenerator.alphaNumeric(8)}`,
    name: "Reason C - increase system",
    description: RandomGenerator.paragraph({ sentences: 4 }),
    direction: "increase",
    is_system_managed: true,
  } satisfies IShoppingMallInventoryAdjustmentReason.ICreate;

  const reasonC: IShoppingMallInventoryAdjustmentReason =
    await api.functional.shoppingMall.admin.inventoryAdjustmentReasons.create(
      connection,
      { body: reasonCCreate },
    );
  typia.assert(reasonC);

  // 3. Search for reasons with direction="increase" and is_system_managed=false.
  const firstSearchBody = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 20 as number & tags.Type<"int32"> & tags.Minimum<1>,
    direction: "increase",
    is_system_managed: false,
    include_deleted: false,
  } satisfies IShoppingMallInventoryAdjustmentReason.IRequest;

  const firstPage: IPageIShoppingMallInventoryAdjustmentReason.ISummary =
    await api.functional.shoppingMall.admin.inventoryAdjustmentReasons.index(
      connection,
      { body: firstSearchBody },
    );
  typia.assert(firstPage);

  // 4. Validate that Reason A is present and Reasons B/C are absent.
  const firstIds = firstPage.data.map((summary) => summary.id);

  TestValidator.predicate(
    "Reason A should be included when filtering by increase and non-system-managed",
    () => firstIds.includes(reasonA.id),
  );

  TestValidator.predicate(
    "Reason B (decrease/system) should be excluded from increase/non-system-managed filter",
    () => !firstIds.includes(reasonB.id),
  );

  TestValidator.predicate(
    "Reason C (increase/system) should be excluded from increase/non-system-managed filter by system flag",
    () => !firstIds.includes(reasonC.id),
  );

  // 5. Second search: direction="decrease" and is_system_managed=true.
  const secondSearchBody = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 20 as number & tags.Type<"int32"> & tags.Minimum<1>,
    direction: "decrease",
    is_system_managed: true,
    include_deleted: false,
  } satisfies IShoppingMallInventoryAdjustmentReason.IRequest;

  const secondPage: IPageIShoppingMallInventoryAdjustmentReason.ISummary =
    await api.functional.shoppingMall.admin.inventoryAdjustmentReasons.index(
      connection,
      { body: secondSearchBody },
    );
  typia.assert(secondPage);

  const secondIds = secondPage.data.map((summary) => summary.id);

  TestValidator.predicate(
    "Reason B should be included when filtering by decrease and system-managed",
    () => secondIds.includes(reasonB.id),
  );

  TestValidator.predicate(
    "Reason A (increase/non-system) should be excluded from decrease/system-managed filter",
    () => !secondIds.includes(reasonA.id),
  );

  TestValidator.predicate(
    "Reason C (increase/system) should be excluded from decrease/system-managed filter by direction",
    () => !secondIds.includes(reasonC.id),
  );
}
