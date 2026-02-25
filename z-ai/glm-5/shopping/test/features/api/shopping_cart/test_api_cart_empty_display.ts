import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCartItem";
import type { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
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
 * Test empty cart display for newly registered customer.
 *
 * This test verifies that when a newly registered customer retrieves their cart,
 * the API correctly returns an empty cart with zero pagination metrics.
 *
 * Test Flow:
 * 1. Register a new customer account
 * 2. Retrieve cart items with default pagination
 * 3. Validate empty cart response structure
 */
export async function test_api_cart_empty_display(
  connection: api.IConnection,
): Promise<void> {
  // Create customer-specific connection
  const customerConnection: api.IConnection = { host: connection.host };
  // Register a new customer (cart should be empty)
  await authorize_customer_join(customerConnection, {});
  // Retrieve cart with default pagination
  const cart = await api.functional.shoppingMall.customer.cart.index(
    customerConnection,
    {
      body: {} satisfies IShoppingMallCartItem.IRequest,
    },
  );
  typia.assert(cart);
  // Validate empty cart state
  TestValidator.equals("cart data should be empty", cart.data.length, 0);
  TestValidator.equals("records should be zero", cart.pagination.records, 0);
  TestValidator.equals("pages should be zero", cart.pagination.pages, 0);
  TestValidator.equals("current page should be 1", cart.pagination.current, 1);
  TestValidator.predicate(
    "limit should be positive",
    cart.pagination.limit > 0,
  );
}
