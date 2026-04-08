import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCartItem";
import type { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import type { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import type { IEcommerceProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProduct";
import type { IEcommerceProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProductImage";
import type { IEcommerceProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProductVariant";
import type { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import type { IEcommerceSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSellerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_ecommerce_customer_carts_items_create } from "../../../generate/generate_random_ecommerce_customer_carts_items_create";
import { generate_random_ecommerce_seller_products_create } from "../../../generate/generate_random_ecommerce_seller_products_create";
import { generate_random_ecommerce_seller_products_variants_create } from "../../../generate/generate_random_ecommerce_seller_products_variants_create";
import { prepare_random_ecommerce_cart_item } from "../../../prepare/prepare_random_ecommerce_cart_item";
import { prepare_random_ecommerce_product } from "../../../prepare/prepare_random_ecommerce_product";
import { prepare_random_ecommerce_product_image } from "../../../prepare/prepare_random_ecommerce_product_image";
import { prepare_random_ecommerce_product_variant } from "../../../prepare/prepare_random_ecommerce_product_variant";

export async function test_api_cart_item_quantity_update_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer registration and authentication
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceCustomer.IJoin,
  });
  typia.assert(customerAuth);
  // 2. Seller registration and authentication
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceSeller.IJoin,
  });
  typia.assert(sellerAuth);
  // 3. Seller creates a product (with automatic category selection)
  const product = await generate_random_ecommerce_seller_products_create(
    sellerConnection,
    {},
  );
  typia.assert(product);
  // 4. Seller creates a product variant
  const variant =
    await generate_random_ecommerce_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {},
      },
    );
  typia.assert(variant);
  // 5. Customer adds the variant to cart
  const cartItem = await generate_random_ecommerce_customer_carts_items_create(
    customerConnection,
    {
      params: { cartId: customerAuth.id },
      body: {
        ecommerce_product_variant_id: variant.id,
        quantity: 1,
      } satisfies IEcommerceCartItem.ICreate,
    },
  );
  typia.assert(cartItem);
  // 6. Update cart item quantity - increase
  const newQuantity = cartItem.quantity + 2;
  const updatedCartItem =
    await api.functional.ecommerce.customer.carts.items.putByCartidAndItemid(
      customerConnection,
      {
        cartId: customerAuth.id,
        itemId: cartItem.id,
        body: {
          quantity: newQuantity,
        } satisfies IEcommerceCartItem.IUpdate,
      },
    );
  typia.assert(updatedCartItem);
  // 7. Validate the update
  TestValidator.equals(
    "quantity increased",
    updatedCartItem.quantity,
    newQuantity,
  );
  TestValidator.predicate(
    "availability status is true",
    updatedCartItem.availabilityStatus === true,
  );
  TestValidator.notEquals(
    "updated_at changed",
    cartItem.updatedAt,
    updatedCartItem.updatedAt,
  );
  // 8. Update cart item quantity - decrease
  const decreasedQuantity = newQuantity - 1;
  const finalCartItem =
    await api.functional.ecommerce.customer.carts.items.putByCartidAndItemid(
      customerConnection,
      {
        cartId: customerAuth.id,
        itemId: cartItem.id,
        body: {
          quantity: decreasedQuantity,
        } satisfies IEcommerceCartItem.IUpdate,
      },
    );
  typia.assert(finalCartItem);
  // 9. Validate the decrease
  TestValidator.equals(
    "quantity decreased",
    finalCartItem.quantity,
    decreasedQuantity,
  );
  TestValidator.predicate(
    "final availability status is true",
    finalCartItem.availabilityStatus === true,
  );
}
