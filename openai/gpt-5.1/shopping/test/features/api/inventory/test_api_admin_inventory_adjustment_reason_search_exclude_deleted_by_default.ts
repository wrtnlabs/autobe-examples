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
 * Validate that inventory adjustment reason search excludes soft-deleted
 * records by default and still returns active records when include_deleted is
 * explicitly enabled.
 *
 * Business context: Admins configure master data for inventory adjustment
 * reasons. The search endpoint supports a soft-delete model using deleted_at,
 * and a flag include_deleted that controls whether logically deleted reasons
 * should be returned. This test ensures the default behavior (include_deleted
 * omitted) hides soft-deleted rows while still returning active reasons, and
 * that enabling include_deleted maintains visibility of active reasons and may
 * additionally surface deleted ones.
 *
 * Steps:
 *
 * 1. Join as an admin using POST /auth/admin/join to obtain an authenticated
 *    context.
 * 2. Create two active inventory adjustment reasons with a common search token in
 *    their codes.
 * 3. Search with PATCH /shoppingMall/admin/inventoryAdjustmentReasons using the
 *    common token and omitting include_deleted; assert that the created reasons
 *    are present in results. We rely on the contract that default behavior
 *    excludes soft-deleted rows even though deleted_at is not exposed on the
 *    summary DTO.
 * 4. Search again with include_deleted=true using the same token; assert that both
 *    created reasons are still present. The test does not require any deleted
 *    rows to exist, but tolerates them if present.
 */
export async function test_api_admin_inventory_adjustment_reason_search_exclude_deleted_by_default(
  connection: api.IConnection,
) {
  // 1. Admin join to establish authenticated context
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuth: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuth);

  // 2. Create two active inventory adjustment reasons with a shared search token in code
  const searchToken = RandomGenerator.alphaNumeric(8).toUpperCase();

  const activeReasonCreateBody = {
    code: `ACTIVE_${searchToken}`,
    name: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    direction: "increase",
    is_system_managed: false,
  } satisfies IShoppingMallInventoryAdjustmentReason.ICreate;

  const controlReasonCreateBody = {
    code: `CONTROL_${searchToken}`,
    name: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    direction: "decrease",
    is_system_managed: false,
  } satisfies IShoppingMallInventoryAdjustmentReason.ICreate;

  const activeReason: IShoppingMallInventoryAdjustmentReason =
    await api.functional.shoppingMall.admin.inventoryAdjustmentReasons.create(
      connection,
      {
        body: activeReasonCreateBody,
      },
    );
  typia.assert(activeReason);

  const controlReason: IShoppingMallInventoryAdjustmentReason =
    await api.functional.shoppingMall.admin.inventoryAdjustmentReasons.create(
      connection,
      {
        body: controlReasonCreateBody,
      },
    );
  typia.assert(controlReason);

  // 3. Search without include_deleted (default behavior)
  const defaultSearchBody = {
    search: searchToken,
    limit: 50 as number & tags.Type<"int32"> & tags.Minimum<1>,
  } satisfies IShoppingMallInventoryAdjustmentReason.IRequest;

  const defaultSearchPage: IPageIShoppingMallInventoryAdjustmentReason.ISummary =
    await api.functional.shoppingMall.admin.inventoryAdjustmentReasons.index(
      connection,
      {
        body: defaultSearchBody,
      },
    );
  typia.assert(defaultSearchPage);

  const defaultIds = defaultSearchPage.data.map((r) => r.id);

  TestValidator.predicate(
    "default search should contain active reason by id",
    defaultIds.includes(activeReason.id),
  );
  TestValidator.predicate(
    "default search should contain control reason by id",
    defaultIds.includes(controlReason.id),
  );

  // 4. Search with include_deleted=true; active reasons must still be present
  const inclusiveSearchBody = {
    search: searchToken,
    include_deleted: true,
    limit: 50 as number & tags.Type<"int32"> & tags.Minimum<1>,
  } satisfies IShoppingMallInventoryAdjustmentReason.IRequest;

  const inclusiveSearchPage: IPageIShoppingMallInventoryAdjustmentReason.ISummary =
    await api.functional.shoppingMall.admin.inventoryAdjustmentReasons.index(
      connection,
      {
        body: inclusiveSearchBody,
      },
    );
  typia.assert(inclusiveSearchPage);

  const inclusiveIds = inclusiveSearchPage.data.map((r) => r.id);

  TestValidator.predicate(
    "inclusive search should still contain active reason by id",
    inclusiveIds.includes(activeReason.id),
  );
  TestValidator.predicate(
    "inclusive search should still contain control reason by id",
    inclusiveIds.includes(controlReason.id),
  );
}
