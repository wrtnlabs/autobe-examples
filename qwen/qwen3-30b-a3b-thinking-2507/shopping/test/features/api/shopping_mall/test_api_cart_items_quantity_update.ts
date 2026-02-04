import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCart";
import type { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerEmailVerification";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_shopping_mall_customer_carts_create } from "../../../generate/generate_random_shopping_mall_customer_carts_create";
import { prepare_random_shopping_mall_cart } from "../../../prepare/prepare_random_shopping_mall_cart";
import { prepare_random_shopping_mall_cart_item } from "../../../prepare/prepare_random_shopping_mall_cart_item";

export async function test_api_cart_items_quantity_update(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as customer
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "testPassword123!",
      phone: RandomGenerator.mobile(),
    } satisfies IShoppingMallCustomer.IJoin,
  });
  // Step 2: Create shopping cart
  const cart: IShoppingMallCart =
    await generate_random_shopping_mall_customer_carts_create(
      customerConnection,
      {},
    );
  typia.assert(cart);
  // Step 3: Add item to cart
  const productVariantId = typia.random<string & tags.Format<"uuid">>();
  const initialQuantity = 2;
  const item: IShoppingMallCartItem =
    await api.functional.shoppingMall.customer.carts.items.create(
      customerConnection,
      {
        cartId: cart.id,
        body: {
          product_variant_id: productVariantId,
          quantity: initialQuantity,
        } satisfies IShoppingMallCartItem.ICreate,
      },
    );
  typia.assert(item);
  // Step 4: Update item quantity
  const updatedQuantity = 5;
  const updatedCart: IShoppingMallCart =
    await api.functional.shoppingMall.customer.carts.update(
      customerConnection,
      {
        cartId: cart.id,
        body: {
          items: [
            {
              quantity: updatedQuantity,
            } satisfies IShoppingMallCartItem.IUpdate,
          ],
        } satisfies IShoppingMallCart.IUpdate,
      },
    );
  typia.assert(updatedCart);
  // Step 5: Validate the update
  TestValidator.equals(
    "cart item quantity should be updated",
    updatedCart.items.find((i) => i.id === item.id)?.quantity,
    updatedQuantity,
  );
}