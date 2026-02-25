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
 * Test the cart listing operation when the customer has an empty cart.
 * After customer authentication via join, call the cart-items endpoint
 * with default parameters. Validate that the response returns an empty
 * data array with correct pagination metadata (current page 1, records 0,
 * pages 0). This tests the edge case of viewing an empty cart, which is
 * a valid business scenario before any items are added.
 */
export async function test_api_cart_items_empty_cart(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer authentication - create a new connection for this actor
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {});
  // 2. Query empty cart with default parameters
  const cartItems = await api.functional.shoppingMall.customer.cart_items.index(
    customerConnection,
    {
      body: {} satisfies IShoppingMallCartItem.IRequest,
    },
  );
  typia.assert(cartItems);
  // 3. Validate empty cart response
  TestValidator.equals("cart should be empty", cartItems.data.length, 0);
  TestValidator.equals(
    "current page should be 1",
    cartItems.pagination.current,
    1,
  );
  TestValidator.equals(
    "records count should be 0",
    cartItems.pagination.records,
    0,
  );
  TestValidator.equals(
    "pages count should be 0",
    cartItems.pagination.pages,
    0,
  );
}
