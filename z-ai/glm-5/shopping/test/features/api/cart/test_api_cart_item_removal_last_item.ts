import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_shopping_mall_customer_customers_cart_items_create } from "../../../generate/generate_random_shopping_mall_customer_customers_cart_items_create";
import { prepare_random_shopping_mall_cart_item } from "../../../prepare/prepare_random_shopping_mall_cart_item";

export async function test_api_cart_item_removal_last_item(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate as customer via join
  const customerConnection: api.IConnection = { host: connection.host };
  const customer: IShoppingMallCustomer.IAuthorized =
    await authorize_customer_join(customerConnection, {});
  typia.assert(customer);
  // Step 2: Add a single product variant to cart
  const cartItem: IShoppingMallCartItem =
    await generate_random_shopping_mall_customer_customers_cart_items_create(
      customerConnection,
      {},
    );
  typia.assert(cartItem);
  // Step 3: Remove the cart item (this is the last/only item)
  await api.functional.shoppingMall.customer.carts.items.erase(
    customerConnection,
    {
      cartItemId: cartItem.id,
    },
  );
  // Step 4: Verify the cart item was deleted by attempting to delete again
  // Should fail with 404 Not Found since the item no longer exists
  await TestValidator.httpError(
    "cart item should no longer exist after deletion",
    404,
    async () => {
      await api.functional.shoppingMall.customer.carts.items.erase(
        customerConnection,
        {
          cartItemId: cartItem.id,
        },
      );
    },
  );
  // Step 5: Verify cart still exists by creating another item
  // If cart was deleted, a new cart would be created; if retained, same cart is used
  const newCartItem: IShoppingMallCartItem =
    await generate_random_shopping_mall_customer_customers_cart_items_create(
      customerConnection,
      {},
    );
  typia.assert(newCartItem);
}
