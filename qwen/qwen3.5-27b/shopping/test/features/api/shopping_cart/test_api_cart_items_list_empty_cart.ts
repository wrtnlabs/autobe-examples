import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCartItem";
import type { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

/**
 * Test that an authenticated customer with an empty cart receives an empty paginated response.
 *
 * This test verifies that:
 * 1. A newly registered customer has an empty cart
 * 2. The cart items endpoint returns valid pagination metadata with zero records
 * 3. The response structure is correct even when no items exist
 */
export async function test_api_cart_items_list_empty_cart(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create customer connection and register new customer
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {},
  });
  // 2. Call cart items endpoint with default pagination (empty body)
  const response = await api.functional.shoppingMall.customer.cart_items.index(
    customerConnection,
    {
      body: {} satisfies IShoppingMallCartItem.IRequest,
    },
  );
  // 3. Validate response structure
  typia.assert(response);
  // 4. Verify data array is empty
  TestValidator.equals("cart items array is empty", response.data.length, 0);
  // 5. Verify pagination metadata
  TestValidator.equals("current page is 1", response.pagination.current, 1);
  TestValidator.equals("limit is 20 (default)", response.pagination.limit, 20);
  TestValidator.equals("records is 0", response.pagination.records, 0);
  TestValidator.equals("pages is 0", response.pagination.pages, 0);
}
