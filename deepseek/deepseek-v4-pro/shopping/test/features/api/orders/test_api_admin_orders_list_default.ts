import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallOrder";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test default admin order listing with no filters and default pagination.
 *
 * Verifies that administrators can browse all platform orders using the default
 * pagination parameters (page 1, limit 20) without any optional filters applied.
 * The response must contain correctly paginated order summaries sorted by
 * creation date in descending order, with each summary including the order code,
 * total price, overall status, creation timestamp, and a complete customer
 * reference.
 *
 * Soft-deleted orders are expected to be automatically excluded from the result
 * set by the server. The customer reference within each summary is validated to
 * include id, email, display name, registration date, and ban status—all of
 * which are verified through typia.assert on the full response.
 *
 * 1. Administrator authenticates via authorize_admin_join.
 * 2. Administrator queries the order listing endpoint with an empty request body.
 * 3. Pagination metadata is validated: current = 1, limit = 20, records >= 0,
 *    and pages = ceil(records / limit).
 * 4. The order array is validated to be sorted by created_at in descending order.
 */
export async function test_api_admin_orders_list_default(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as platform administrator
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Query orders with default pagination (no filters)
  const response = await api.functional.shoppingMall.admin.orders.index(
    adminConnection,
    { body: {} satisfies IShoppingMallOrder.IRequest },
  );
  typia.assert(response);
  // 3. Validate pagination metadata
  const { pagination, data } = response;
  TestValidator.equals("current page", pagination.current, 1);
  TestValidator.equals("limit", pagination.limit, 20);
  TestValidator.predicate("records non-negative", pagination.records >= 0);
  TestValidator.equals(
    "pages equals ceil(records / limit)",
    pagination.pages,
    Math.ceil(pagination.records / pagination.limit),
  );
  // 4. Verify descending order by created_at
  for (let i = 1; i < data.length; i++) {
    TestValidator.predicate(
      "orders sorted by created_at descending",
      data[i - 1].created_at >= data[i].created_at,
    );
  }
}
