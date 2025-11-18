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
 * Validate pagination and ordering behavior for admin inventory adjustment
 * reason search.
 *
 * Business goal: Ensure that an authenticated admin can page through inventory
 * adjustment reasons using the search endpoint (PATCH
 * /shoppingMall/admin/inventoryAdjustmentReasons) with predictable ordering by
 * the `code` field, and that `page` and `limit` parameters yield correct slices
 * and pagination metadata.
 *
 * Scenario steps:
 *
 * 1. Join as an admin to obtain an authenticated session.
 * 2. Create three inventory adjustment reasons with deterministic codes
 *    ("AAA_TEST", "BBB_TEST", "CCC_TEST").
 * 3. Request page 1 with limit 2 ordered by code ascending, and verify that:
 *
 *    - Pagination.current === 1
 *    - Pagination.limit === 2
 *    - Pagination.records >= 3
 *    - Pagination.pages === Math.ceil(records / limit)
 *    - Data.length === 2
 *    - Data codes are ["AAA_TEST", "BBB_TEST"] in this order.
 * 4. Request page 2 with the same ordering and verify that:
 *
 *    - Pagination.current === 2
 *    - Data contains at least one record
 *    - The first record code is "CCC_TEST"
 *    - Codes on page 2 do not overlap with codes on page 1.
 */
export async function test_api_admin_inventory_adjustment_reason_search_pagination_and_ordering(
  connection: api.IConnection,
) {
  // 1. Join as an admin to establish authenticated context
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(admin);

  // 2. Create three deterministic inventory adjustment reasons
  const reasonCodes = ["AAA_TEST", "BBB_TEST", "CCC_TEST"] as const;

  const createReason = async (
    code: string,
  ): Promise<IShoppingMallInventoryAdjustmentReason> => {
    const body = {
      code,
      name: `${code}_NAME`,
      description: null,
      direction: "increase",
      is_system_managed: false,
    } satisfies IShoppingMallInventoryAdjustmentReason.ICreate;

    const reason =
      await api.functional.shoppingMall.admin.inventoryAdjustmentReasons.create(
        connection,
        { body },
      );
    typia.assert(reason);
    return reason;
  };

  const createdReasons: IShoppingMallInventoryAdjustmentReason[] = [];
  for (const code of reasonCodes) {
    const reason = await createReason(code);
    createdReasons.push(reason);
  }

  // Helper to build a search request body
  const buildSearchBody = (
    page: number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: number & tags.Type<"int32"> & tags.Minimum<1>,
  ): IShoppingMallInventoryAdjustmentReason.IRequest => {
    return {
      page,
      limit,
      order_by: "code",
      order_direction: "asc",
    } satisfies IShoppingMallInventoryAdjustmentReason.IRequest;
  };

  // 3. Page 1 request: page=1, limit=2, order_by=code asc
  const page1Body: IShoppingMallInventoryAdjustmentReason.IRequest =
    buildSearchBody(
      1 as number & tags.Type<"int32"> & tags.Minimum<1>,
      2 as number & tags.Type<"int32"> & tags.Minimum<1>,
    );

  const page1: IPageIShoppingMallInventoryAdjustmentReason.ISummary =
    await api.functional.shoppingMall.admin.inventoryAdjustmentReasons.index(
      connection,
      { body: page1Body },
    );
  typia.assert<IPageIShoppingMallInventoryAdjustmentReason.ISummary>(page1);

  const page1Pagination = page1.pagination;
  const page1Data = page1.data;

  // Basic pagination assertions for page 1
  TestValidator.equals(
    "page 1: current page should be 1",
    page1Pagination.current,
    1,
  );
  TestValidator.equals("page 1: limit should be 2", page1Pagination.limit, 2);
  TestValidator.predicate(
    "page 1: records should be at least 3",
    page1Pagination.records >= 3,
  );

  const expectedPages = Math.ceil(
    page1Pagination.records / page1Pagination.limit,
  );
  TestValidator.equals(
    "page 1: pages should equal ceil(records / limit)",
    page1Pagination.pages,
    expectedPages,
  );

  TestValidator.equals("page 1: data length should be 2", page1Data.length, 2);

  const page1Codes = page1Data.map((r) => r.code);
  TestValidator.equals(
    "page 1: first two codes should be AAA_TEST and BBB_TEST",
    page1Codes,
    ["AAA_TEST", "BBB_TEST"],
  );

  // 5. Page 2 request
  const page2Body: IShoppingMallInventoryAdjustmentReason.IRequest =
    buildSearchBody(
      2 as number & tags.Type<"int32"> & tags.Minimum<1>,
      2 as number & tags.Type<"int32"> & tags.Minimum<1>,
    );

  const page2: IPageIShoppingMallInventoryAdjustmentReason.ISummary =
    await api.functional.shoppingMall.admin.inventoryAdjustmentReasons.index(
      connection,
      { body: page2Body },
    );
  typia.assert<IPageIShoppingMallInventoryAdjustmentReason.ISummary>(page2);

  const page2Pagination = page2.pagination;
  const page2Data = page2.data;

  TestValidator.equals(
    "page 2: current page should be 2",
    page2Pagination.current,
    2,
  );
  TestValidator.predicate(
    "page 2: data length should be at least 1",
    page2Data.length >= 1,
  );

  const page2Codes = page2Data.map((r) => r.code);

  // Expect CCC_TEST to appear first on page 2 when no other interfering codes
  TestValidator.equals(
    "page 2: first code should be CCC_TEST",
    page2Codes[0],
    "CCC_TEST",
  );

  // No overlap between page 1 and page 2 codes
  const overlapExists = page2Codes.some((code) => page1Codes.includes(code));
  TestValidator.predicate(
    "page 1 and page 2 should not share codes",
    overlapExists === false,
  );
}
