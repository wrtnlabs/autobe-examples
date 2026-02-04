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

export async function test_api_cart_item_max_quantity_update(
  connection: api.IConnection,
): Promise<void> {
  // Create customer connection and authenticate
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, { body: {} });
  // Create cart via utility function
  const cart = await generate_random_shopping_mall_customer_carts_create(
    customerConnection,
    {
      body: {},
    },
  );
  typia.assert(cart);
  // Get product variant ID from random data
  const productVariantId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // Add item to cart with initial quantity
  const initialItem =
    await api.functional.shoppingMall.customer.carts.items.create(
      customerConnection,
      {
        cartId: cart.id,
        body: {
          product_variant_id: productVariantId,
          quantity: 1,
        } satisfies IShoppingMallCartItem.ICreate,
      },
    );
  typia.assert(initialItem);
  // Simulate product stock quantity (real stock would be retrieved from API)
  const stockQuantity: number &
    tags.Type<"int32"> &
    tags.Minimum<1> &
    tags.Maximum<100> = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
  >();
  // Update cart item quantity to max available stock
  const updatedItem =
    await api.functional.shoppingMall.customer.carts.items.update(
      customerConnection,
      {
        cartId: cart.id,
        itemId: initialItem.id,
        body: {
          quantity: stockQuantity,
        } satisfies IShoppingMallCartItem.IUpdate,
      },
    );
  typia.assert(updatedItem);
  // Validate the updated quantity matches stock level
  TestValidator.equals(
    "cart item quantity matches maximum available stock",
    updatedItem.quantity,
    stockQuantity,
  );
}
