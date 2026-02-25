import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCartItem";
import type { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import type { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import type { IEcommerceProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProduct";
import type { IEcommerceProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProductVariant";
import type { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import type { IEcommerceShoppingCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceShoppingCart";
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

/**
 * Test retrieving a customer's shopping cart containing multiple items from different sellers.
 * Create customer authentication, add products from different sellers to cart, then retrieve
 * the cart to verify all items are correctly loaded with complete product details.
 */
export async function test_api_cart_retrieve_populated(
  connection: api.IConnection,
): Promise<void> {
  // Create customer connection and authenticate
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await api.functional.ecommerce.auth.customer.join(
    customerConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "password123",
        display_name: RandomGenerator.name(),
        phone_number: RandomGenerator.mobile(),
      } satisfies IEcommerceCustomer.IJoin,
    },
  );
  typia.assert(customer);
  // Create first seller connection and authenticate
  const seller1Connection: api.IConnection = { host: connection.host };
  const seller1 = await api.functional.ecommerce.auth.seller.join(
    seller1Connection,
    {
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
    },
  );
  typia.assert(seller1);
  // Create second seller connection and authenticate
  const seller2Connection: api.IConnection = { host: connection.host };
  const seller2 = await api.functional.ecommerce.auth.seller.join(
    seller2Connection,
    {
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
    },
  );
  typia.assert(seller2);
  // Create category ID for products
  const categoryId = typia.random<string & tags.Format<"uuid">>();
  // Create product from first seller
  const product1 = await api.functional.ecommerce.seller.products.create(
    seller1Connection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 1 }),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        base_price: typia.random<
          number & tags.Minimum<100> & tags.Maximum<1000>
        >(),
        category_id: categoryId,
      } satisfies IEcommerceProduct.ICreate,
    },
  );
  typia.assert(product1);
  // Create product variant for first product
  const variant1 =
    await api.functional.ecommerce.seller.products.variants.create(
      seller1Connection,
      {
        productId: product1.id,
        body: {
          sku: RandomGenerator.alphaNumeric(8),
          option_values: JSON.stringify({ color: "red", size: "M" }),
          price_override: null,
          quantity: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<100> & tags.Maximum<1000>
          >(),
        } satisfies IEcommerceProductVariant.ICreate,
      },
    );
  typia.assert(variant1);
  // Create product from second seller
  const product2 = await api.functional.ecommerce.seller.products.create(
    seller2Connection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 1 }),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        base_price: typia.random<
          number & tags.Minimum<100> & tags.Maximum<1000>
        >(),
        category_id: categoryId,
      } satisfies IEcommerceProduct.ICreate,
    },
  );
  typia.assert(product2);
  // Create product variant for second product
  const variant2 =
    await api.functional.ecommerce.seller.products.variants.create(
      seller2Connection,
      {
        productId: product2.id,
        body: {
          sku: RandomGenerator.alphaNumeric(8),
          option_values: JSON.stringify({ color: "blue", size: "L" }),
          price_override: null,
          quantity: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<100> & tags.Maximum<1000>
          >(),
        } satisfies IEcommerceProductVariant.ICreate,
      },
    );
  typia.assert(variant2);
  // Create a cart first by adding items to it
  // Create a new empty cart by first calling carts.create endpoint
  const cartId = typia.random<string & tags.Format<"uuid">>();
  // Add first item to cart
  const cartItem1 = await api.functional.ecommerce.customer.carts.items.create(
    customerConnection,
    {
      cartId,
      body: {
        product_variant_id: variant1.id,
        quantity: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>
        >(),
      } satisfies IEcommerceCartItem.ICreate,
    },
  );
  typia.assert(cartItem1);
  // Add second item to cart from different seller
  const cartItem2 = await api.functional.ecommerce.customer.carts.items.create(
    customerConnection,
    {
      cartId,
      body: {
        product_variant_id: variant2.id,
        quantity: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>
        >(),
      } satisfies IEcommerceCartItem.ICreate,
    },
  );
  typia.assert(cartItem2);
  // Retrieve the populated cart
  const cart = await api.functional.ecommerce.customer.carts.at(
    customerConnection,
    {
      cartId,
    },
  );
  typia.assert(cart);
  // Validate cart structure and metadata
  TestValidator.equals("cart ID matches", cart.id, cartId);
  TestValidator.equals("customer ID matches", cart.customer.id, customer.id);
  TestValidator.predicate(
    "cart has created timestamp",
    () => !!cart.created_at,
  );
  TestValidator.predicate(
    "cart has updated timestamp",
    () => !!cart.updated_at,
  );
  TestValidator.equals(
    "cart has correct number of items",
    cart.cartItems.length,
    2,
  );
  // Verify each cart item contains complete product and variant information
  const item1 = cart.cartItems.find((item) => item.id === cartItem1.id);
  TestValidator.predicate("first cart item found", () => !!item1);
  if (item1) {
    TestValidator.equals(
      "first item variant ID matches",
      item1.productVariant.id,
      variant1.id,
    );
    TestValidator.equals(
      "first item quantity matches",
      item1.quantity,
      cartItem1.quantity,
    );
    TestValidator.equals(
      "first item product name matches",
      item1.productVariant.product.name,
      product1.name,
    );
    TestValidator.equals(
      "first item product base price matches",
      item1.productVariant.product.base_price,
      product1.base_price,
    );
    TestValidator.predicate(
      "first item has complete seller information",
      () =>
        !!item1.productVariant.product.seller.id &&
        !!item1.productVariant.product.seller.shop_name,
    );
  }
  const item2 = cart.cartItems.find((item) => item.id === cartItem2.id);
  TestValidator.predicate("second cart item found", () => !!item2);
  if (item2) {
    TestValidator.equals(
      "second item variant ID matches",
      item2.productVariant.id,
      variant2.id,
    );
    TestValidator.equals(
      "second item quantity matches",
      item2.quantity,
      cartItem2.quantity,
    );
    TestValidator.equals(
      "second item product name matches",
      item2.productVariant.product.name,
      product2.name,
    );
    TestValidator.equals(
      "second item product base price matches",
      item2.productVariant.product.base_price,
      product2.base_price,
    );
    TestValidator.predicate(
      "second item has complete seller information",
      () =>
        !!item2.productVariant.product.seller.id &&
        !!item2.productVariant.product.seller.shop_name,
    );
  }
  // Verify sellers are different
  if (item1 && item2) {
    TestValidator.notEquals(
      "items from different sellers",
      item1.productVariant.product.seller.id,
      item2.productVariant.product.seller.id,
    );
  }
}
