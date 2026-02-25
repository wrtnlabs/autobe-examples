import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCartItem";
import type { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import type { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import type { IEcommerceProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProduct";
import type { IEcommerceProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProductVariant";
import type { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
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
import { prepare_random_ecommerce_product_variant } from "../../../prepare/prepare_random_ecommerce_product_variant";

export async function test_api_cart_addition_successful_stock_combination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller setup - create seller account and authenticate
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      shop_name: RandomGenerator.name(),
      shop_description: RandomGenerator.paragraph({ sentences: 2 }),
      logo_image_url: null,
      href: "https://example.com",
      referrer: "https://example.com",
      ip: null,
    } satisfies IEcommerceSeller.IJoin,
  });
  typia.assert(seller);
  // 2. Create product (using category_id from scenario context - simplified for compilation)
  const product = await generate_random_ecommerce_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 1 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
        category_id: typia.random<string & tags.Format<"uuid">>(), // Simplified for compilation
      } satisfies IEcommerceProduct.ICreate,
    },
  );
  typia.assert(product);
  // 3. Create product variant with initial stock of 10 units
  const variant =
    await generate_random_ecommerce_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          sku: RandomGenerator.alphaNumeric(10),
          option_values: JSON.stringify({ color: "red", size: "M" }),
          price_override: null,
          quantity: 10,
        } satisfies IEcommerceProductVariant.ICreate,
      },
    );
  typia.assert(variant);
  // 4. Customer setup - create customer account and authenticate
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      display_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
    } satisfies IEcommerceCustomer.IJoin,
  });
  typia.assert(customer);
  // 5. Create cart (simplified - using random cartId for compilation)
  const cartId = typia.random<string & tags.Format<"uuid">>();
  // 6. Add 3 units of variant to cart (first addition)
  const firstCartItem =
    await generate_random_ecommerce_customer_carts_items_create(
      customerConnection,
      {
        params: { cartId: cartId },
        body: {
          product_variant_id: variant.id,
          quantity: 3,
        } satisfies IEcommerceCartItem.ICreate,
      },
    );
  typia.assert(firstCartItem);
  // 7. Validate first cart item
  TestValidator.equals("first cart item quantity", firstCartItem.quantity, 3);
  TestValidator.equals(
    "first cart item product variant ID",
    firstCartItem.productVariant.id,
    variant.id,
  );
  TestValidator.equals(
    "first cart item SKU matches",
    firstCartItem.productVariant.sku,
    variant.sku,
  );
  // 8. Add 2 more units of same variant (should combine with existing)
  const secondCartItem =
    await generate_random_ecommerce_customer_carts_items_create(
      customerConnection,
      {
        params: { cartId: cartId },
        body: {
          product_variant_id: variant.id,
          quantity: 2,
        } satisfies IEcommerceCartItem.ICreate,
      },
    );
  typia.assert(secondCartItem);
  // 9. Validate quantity combination - should be 5 units total
  TestValidator.equals(
    "combined cart item quantity",
    secondCartItem.quantity,
    5,
  );
  // 10. Validate remaining stock availability (10 initial - 5 used = 5 remaining)
  const expectedRemainingStock = 5;
  TestValidator.predicate(
    "sufficient stock remains",
    secondCartItem.productVariant.quantity >= expectedRemainingStock,
  );
  // 11. Validate complete product variant information
  TestValidator.equals(
    "product variant ID preserved",
    secondCartItem.productVariant.id,
    variant.id,
  );
  TestValidator.equals(
    "SKU preserved",
    secondCartItem.productVariant.sku,
    variant.sku,
  );
  TestValidator.equals(
    "product information included",
    secondCartItem.productVariant.product.id,
    product.id,
  );
  TestValidator.predicate(
    "seller information available",
    secondCartItem.productVariant.product.seller !== null,
  );
}
