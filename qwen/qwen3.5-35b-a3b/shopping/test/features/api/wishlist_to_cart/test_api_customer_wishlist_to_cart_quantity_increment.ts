import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCartItem";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallShoppingCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShoppingCart";
import type { IEcommerceMallWishlistToCartRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallWishlistToCartRequest";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_ecommerce_mall_customer_carts_items_create } from "../../../generate/generate_random_ecommerce_mall_customer_carts_items_create";
import { prepare_random_ecommerce_mall_cart_item } from "../../../prepare/prepare_random_ecommerce_mall_cart_item";

export async function test_api_customer_wishlist_to_cart_quantity_increment(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer registration and authentication
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: (typia.random<string & tags.Format<"email">>() satisfies string) as (string & tags.Format<"email"> & tags.MinLength<1> & tags.MaxLength<255>),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(customer);
  // 2. Create initial cart item for a specific variant
  const variantId = typia.random<string & tags.Format<"uuid">>();
  const existingQuantity = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<1>
  >();
  const existingPrice = typia.random<number & tags.Minimum<1>>();
  const cartItemConnection: api.IConnection = { host: connection.host };
  const existingCartItem =
    await generate_random_ecommerce_mall_customer_carts_items_create(
      cartItemConnection,
      {
        body: {
          variant_id: variantId,
          quantity: existingQuantity,
        },
        params: {
          cartId: customer.id,
        },
      },
    );
  typia.assert(existingCartItem);
  // 3. Transfer the same variant from wishlist to cart
  const wishlistTransferConnection: api.IConnection = { host: connection.host };
  const wishlistTransferItem =
    await api.functional.ecommerceMall.customer.wishlist_to_cart.transferFromWishlist(
      wishlistTransferConnection,
      {
        body: {
          wishlistEntryId: typia.random<string & tags.Format<"uuid">>(),
          variantId: variantId,
        },
      },
    );
  typia.assert(wishlistTransferItem);
  // 4. Validate quantity incremented correctly
  TestValidator.equals(
    "cart item quantity incremented by 1",
    wishlistTransferItem.quantity,
    existingCartItem.quantity + 1,
  );
  // 5. Validate createdAt timestamp preserved (original addition)
  TestValidator.equals(
    "original addition timestamp preserved",
    wishlistTransferItem.createdAt,
    existingCartItem.createdAt,
  );
  // 6. Validate updatedAt timestamp updated (modification recorded)
  TestValidator.notEquals(
    "modification timestamp updated",
    wishlistTransferItem.createdAt,
    wishlistTransferItem.updatedAt,
  );
  // 7. Validate price remains original captured price
  TestValidator.equals(
    "price remains original captured price",
    wishlistTransferItem.price,
    existingCartItem.price,
  );
}