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

/**
 * Test cart item creation with stock validation for e-commerce platform.
 *
 * Validates the successful flow of adding a product variant to a customer's shopping cart when the variant has available stock. The test ensures proper authentication, product setup, variant creation, and cart item creation with correct availability status computation.
 *
 * The scenario follows the natural e-commerce flow: customer registration, seller registration, product creation, variant creation with stock, and finally adding the variant to the cart. All operations use actor-specific connections to maintain proper authentication context.
 *
 * 1. Customer registers and authenticates via join operation.
 * 2. Seller registers and authenticates via join operation.
 * 3. Seller creates a product with name, description, category, and base price.
 * 4. Seller creates a product variant with SKU code and option values.
 * 5. Customer adds the variant to their cart with quantity > 0.
 * 6. Validates the cart item response contains embedded variant details.
 * 7. Validates availabilityStatus is true (variant has stock).
 * 8. Validates timestamps are properly set (createdAt, updatedAt).
 */
export async function test_api_cart_item_creation_with_stock_validation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer registration and authentication
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
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
    } satisfies IEcommerceSeller.IJoin,
  });
  typia.assert(sellerAuth);
  // 3. Create a category first (required for product creation)
  // Note: We'll use a random UUID for category_id as the system should handle it
  const categoryId = typia.random<string & tags.Format<"uuid">>();
  // 4. Seller creates a product
  const product = await api.functional.ecommerce.seller.products.create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        category_id: categoryId,
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
      } satisfies IEcommerceProduct.ICreate,
    },
  );
  typia.assert(product);
  // 5. Seller creates a product variant with stock
  const variant =
    await api.functional.ecommerce.seller.products.variants.create(
      sellerConnection,
      {
        productId: product.id,
        body: {
          sku_code: RandomGenerator.alphabets(8).toUpperCase(),
          option_values: `color=${RandomGenerator.name(1)};size=${RandomGenerator.name(1)}`,
          price: typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1000>
          >(),
        } satisfies IEcommerceProductVariant.ICreate,
      },
    );
  typia.assert(variant);
  // 6. Add variant to customer's cart
  // Note: We need the cartId - typically this would be retrieved from customer's cart
  // For this test, we'll use a random UUID as the cart ID (system may create cart automatically)
  const cartId = typia.random<string & tags.Format<"uuid">>();
  const cartItem = await api.functional.ecommerce.customer.carts.items.create(
    customerConnection,
    {
      cartId: cartId,
      body: {
        ecommerce_product_variant_id: variant.id,
        quantity: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>
        >(),
      } satisfies IEcommerceCartItem.ICreate,
    },
  );
  typia.assert(cartItem);
  // 7. Validate cart item response
  TestValidator.equals(
    "variant ID matches",
    cartItem.productVariant.id,
    variant.id,
  );
  TestValidator.predicate(
    "availability status is true (in stock)",
    cartItem.availabilityStatus === true,
  );
  TestValidator.predicate("quantity is positive", cartItem.quantity > 0);
  TestValidator.predicate(
    "createdAt is valid date-time",
    new Date(cartItem.createdAt).getTime() > 0,
  );
  TestValidator.predicate(
    "updatedAt is valid date-time",
    new Date(cartItem.updatedAt).getTime() > 0,
  );
}
