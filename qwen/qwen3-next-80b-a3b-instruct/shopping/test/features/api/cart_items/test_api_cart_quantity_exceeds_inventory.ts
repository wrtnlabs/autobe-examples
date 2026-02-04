import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCartItem";
import type { IShoppingMallAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAuthorizationToken";
import type { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { prepare_random_shopping_mall_cart_item } from "../../../prepare/prepare_random_shopping_mall_cart_item";
import { generate_random_shopping_mall_customer_cart_items_index } from "../../../generate/generate_random_shopping_mall_customer_cart_items_index";
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
export async function test_api_cart_quantity_exceeds_inventory(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create customer connection and authenticate
  const customerConnection: api.IConnection = { host: connection.host };
  const customer: IShoppingMallCustomer.IAuthorized =
    await authorize_customer_join(customerConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: "https://example.com/",
        referrer: "https://example.com/referral",
      } satisfies IShoppingMallCustomer.IJoin,
    });
  typia.assert(customer);
  // Step 2: Create product variant in cart with quantity 1 using generate utility
  // This utility function calls POST /shoppingMall/customer/cart-items
  // It creates a cart item with a random product variant
  const cartItem =
    await generate_random_shopping_mall_customer_cart_items_index(
      customerConnection,
      {
        body: {
          variantId: typia.random<string & tags.Format<"uuid">>(),
          quantity: 1,
        } satisfies IShoppingMallCartItem.ICreate,
      },
    );
  typia.assert(cartItem);
  // Step 3: Attempt to update cart quantity to exceed available stock
  // Request quantity 2, which should exceed the available inventory (assumed to be 1)
  const updatedCart =
    await api.functional.shoppingMall.customer.cart_items.patch(
      customerConnection,
      {
        body: {
          quantity: 2,
        } satisfies IShoppingMallCartItem.IRequest,
      },
    );
  typia.assert(updatedCart);
  // Step 4: Validate response
  // The system should reduce quantity to maximum available stock (1)
  // Since we don't control inventory and the generated variant has no guaranteed stock level,
  // we validate the system is behaving as expected by checking that the quantity is reduced
  // and we get a valid cart item response
  TestValidator.equals(
    "cart item quantity reduced to available stock",
    updatedCart.data[0].quantity,
    1,
  );
  // The scenario mentioned "warning message", but according to the provided DTO IShoppingMallCartItem.ISummary,
  // it only has cartId, variantId, quantity - no warnings property exists
  // Therefore, we cannot validate a warning message - it's not part of the API contract
  // We focus on the core functionality: quantity reduction to available stock level
}
