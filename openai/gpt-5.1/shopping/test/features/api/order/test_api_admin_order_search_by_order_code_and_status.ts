import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallOrderSearch } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallOrderSearch";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallOrderSearch } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderSearch";

/**
 * Validate admin order search filtering by order codes and current statuses.
 *
 * Business goal: Ensure that the administrative order search endpoint correctly
 * applies combined filters on `order_codes` and `current_statuses` while
 * respecting pagination. The test focuses on filter semantics rather than data
 * provisioning, assuming that fixture data may or may not contain matching
 * orders.
 *
 * Steps:
 *
 * 1. Register an admin via POST /auth/admin/join to obtain an authenticated
 *    context (SDK wires Authorization header automatically).
 * 2. Call PATCH /shoppingMall/admin/search/orders with a request body that
 *    specifies:
 *
 *    - `order_codes`: ["KNOWN_ORDER_CODE_1", "KNOWN_ORDER_CODE_2"].
 *    - `current_statuses`: ["payment_confirmed", "shipped"].
 *    - `page` = 1, `limit` = 50.
 *    - All other filters left undefined or null where applicable.
 * 3. Assert response shape with typia.assert.
 * 4. If any records are returned, verify that:
 *
 *    - Each record's `order_code` is one of the requested codes.
 *    - Each record's `current_status` is one of the requested statuses.
 *    - No result violates these constraints.
 *
 * This test intentionally does not assert that specific order codes exist in
 * the dataset, making it robust against fixture changes while still validating
 * filter behavior.
 */
export async function test_api_admin_order_search_by_order_code_and_status(
  connection: api.IConnection,
) {
  // 1. Register an admin and obtain an authenticated context
  const admin = await api.functional.auth.admin.join(connection, {
    body: typia.random<IShoppingMallAdminJoin.ICreate>(),
  });
  typia.assert<IShoppingMallAdmin.IAuthorized>(admin);

  // 2. Define search filters for order codes and statuses
  const filterOrderCodes = ["KNOWN_ORDER_CODE_1", "KNOWN_ORDER_CODE_2"];
  const filterStatuses = ["payment_confirmed", "shipped"];

  const requestBody = {
    order_codes: filterOrderCodes,
    current_statuses: filterStatuses,
    created_from: null,
    created_to: null,
    placed_from: null,
    placed_to: null,
    updated_from: null,
    updated_to: null,
    min_grand_total_amount: null,
    max_grand_total_amount: null,
    page: 1,
    limit: 50,
  } satisfies IShoppingMallOrderSearch.IRequest;

  // 3. Execute the admin order search
  const pageResult =
    await api.functional.shoppingMall.admin.search.orders.index(connection, {
      body: requestBody,
    });
  typia.assert<IPageIShoppingMallOrderSearch.ISummary>(pageResult);

  const { data } = pageResult;

  // 4. If data is returned, verify that all records satisfy the filters
  if (data.length > 0) {
    for (const order of data) {
      // Validate that order_code is one of the requested values
      TestValidator.predicate(
        "order_code must be within requested filterOrderCodes",
        filterOrderCodes.includes(order.order_code),
      );

      // Validate that current_status is one of the requested values
      TestValidator.predicate(
        "current_status must be within requested filterStatuses",
        filterStatuses.includes(order.current_status),
      );
    }
  }
}
