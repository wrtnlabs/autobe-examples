import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCustomerCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCustomerCartItem";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerCartItem";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOption";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

/**
 * Test cart items listing for an empty cart scenario.
 *
 * Validates that a newly registered customer with no cart items can successfully retrieve their cart listing. The test verifies that the API returns a valid response structure with an empty data array and correct pagination metadata even when the cart contains no items.
 *
 * This test ensures the cart listing endpoint handles the empty state gracefully without throwing errors, and that pagination metadata correctly reflects zero records and zero pages.
 *
 * 1. Register a new customer account with randomized credentials.
 * 2. Retrieve cart items list with default pagination parameters.
 * 3. Validate response structure contains empty data array.
 * 4. Verify pagination metadata shows records=0 and pages=0.
 */
export async function test_api_cart_items_list_empty_cart(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new customer
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {});
  // 2. Retrieve cart items list (empty cart)
  const cartItems = await api.functional.shoppingMall.customer.cart.items.index(
    customerConnection,
    {
      body: {} satisfies IShoppingMallCustomerCartItem.IRequest,
    },
  );
  typia.assert(cartItems);
  // 3. Validate empty data array
  TestValidator.equals("cart items data is empty", cartItems.data.length, 0);
  // 4. Validate pagination metadata for empty cart
  TestValidator.equals(
    "pagination records is 0",
    cartItems.pagination.records,
    0,
  );
  TestValidator.equals("pagination pages is 0", cartItems.pagination.pages, 0);
  TestValidator.equals(
    "pagination current is 1",
    cartItems.pagination.current,
    1,
  );
  TestValidator.predicate(
    "pagination limit is positive",
    cartItems.pagination.limit > 0,
  );
}
