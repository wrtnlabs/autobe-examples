import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEShoppingMallOrderStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/IEShoppingMallOrderStatus";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallOrder";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

/**
 * Test customer order search by order number functionality.
 *
 * Validates various search scenarios:
 * - Exact match search
 * - Partial match search
 * - Case-insensitive search
 * - Non-matching search returning empty results
 * - Proper pagination metadata
 */
export async function test_api_customer_orders_search_by_order_number(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer authentication
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {});
  typia.assert(customer);
  // 2. Get all orders for the authenticated customer (baseline)
  const allOrders = await api.functional.shoppingMall.customer.orders.index(
    customerConnection,
    { body: {} satisfies IShoppingMallOrder.IRequest },
  );
  typia.assert(allOrders);
  // Skip test if no orders exist
  if (allOrders.data.length === 0) {
    return;
  }
  // Get first order for testing exact match
  const targetOrder = allOrders.data[0];
  const targetOrderNumber = targetOrder.order_number;
  // 3. Test exact match search
  const exactMatchResult =
    await api.functional.shoppingMall.customer.orders.index(
      customerConnection,
      {
        body: {
          search: targetOrderNumber,
        } satisfies IShoppingMallOrder.IRequest,
      },
    );
  typia.assert(exactMatchResult);
  TestValidator.predicate(
    "exact match returns order with matching order number",
    exactMatchResult.data.some(
      (order) => order.order_number === targetOrderNumber,
    ),
  );
  // 4. Test partial match search (first 8 characters)
  if (targetOrderNumber.length >= 8) {
    const partialSearchTerm = targetOrderNumber.substring(0, 8);
    const partialMatchResult =
      await api.functional.shoppingMall.customer.orders.index(
        customerConnection,
        {
          body: {
            search: partialSearchTerm,
          } satisfies IShoppingMallOrder.IRequest,
        },
      );
    typia.assert(partialMatchResult);
    TestValidator.predicate(
      "partial match returns orders containing search term",
      partialMatchResult.data.every((order) =>
        order.order_number.includes(partialSearchTerm),
      ),
    );
  }
  // 5. Test case-insensitive search
  const caseInsensitiveSearch = targetOrderNumber.toLowerCase();
  if (caseInsensitiveSearch !== targetOrderNumber) {
    const caseInsensitiveResult =
      await api.functional.shoppingMall.customer.orders.index(
        customerConnection,
        {
          body: {
            search: caseInsensitiveSearch,
          } satisfies IShoppingMallOrder.IRequest,
        },
      );
    typia.assert(caseInsensitiveResult);
    TestValidator.predicate(
      "case-insensitive search returns matching orders",
      caseInsensitiveResult.data.some(
        (order) => order.order_number.toLowerCase() === caseInsensitiveSearch,
      ),
    );
  }
  // 6. Test non-matching search
  const nonMatchingSearch = "NONEXISTENT-ORDER-NUMBER-12345-XYZ";
  const nonMatchingResult =
    await api.functional.shoppingMall.customer.orders.index(
      customerConnection,
      {
        body: {
          search: nonMatchingSearch,
        } satisfies IShoppingMallOrder.IRequest,
      },
    );
  typia.assert(nonMatchingResult);
  TestValidator.equals(
    "non-matching search returns empty data array",
    nonMatchingResult.data.length,
    0,
  );
  TestValidator.equals(
    "non-matching search pagination shows zero records",
    nonMatchingResult.pagination.records,
    0,
  );
  // 7. Validate pagination structure
  TestValidator.predicate(
    "pagination current page is valid",
    allOrders.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination limit is valid",
    allOrders.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination records matches data length",
    allOrders.pagination.records >= allOrders.data.length,
  );
}
