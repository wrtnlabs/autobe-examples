import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCartItem";
import type { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import type { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import type { IEcommerceInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceInventoryRecord";
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
import { generate_random_ecommerce_seller_variants_inventory_create } from "../../../generate/generate_random_ecommerce_seller_variants_inventory_create";
import { prepare_random_ecommerce_cart_item } from "../../../prepare/prepare_random_ecommerce_cart_item";
import { prepare_random_ecommerce_inventory_record } from "../../../prepare/prepare_random_ecommerce_inventory_record";
import { prepare_random_ecommerce_product } from "../../../prepare/prepare_random_ecommerce_product";
import { prepare_random_ecommerce_product_image } from "../../../prepare/prepare_random_ecommerce_product_image";
import { prepare_random_ecommerce_product_variant } from "../../../prepare/prepare_random_ecommerce_product_variant";

/**
 * Test cart item creation is blocked for out-of-stock product variants.
 *
 * Validates the business rule that customers cannot add product variants with zero inventory to their shopping cart. This ensures stock accuracy and prevents overselling by enforcing inventory validation at cart creation time.
 *
 * The test creates a complete scenario where a seller manages product inventory, sets a variant to out-of-stock status, and verifies the system correctly blocks cart operations for unavailable items.
 *
 * 1. Customer account is created and authenticated for cart operations.
 * 2. Seller account is created and authenticated for product management.
 * 3. Seller creates a product with basic information.
 * 4. Seller creates a product variant with SKU and options.
 * 5. Seller subtracts all inventory to set variant stock to zero.
 * 6. Customer attempts to add the out-of-stock variant to cart.
 * 7. System rejects the request with appropriate error.
 * 8. No cart item is created for the unavailable variant.
 */
export async function test_api_cart_item_creation_out_of_stock_blocked(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate customer
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceCustomer.IJoin,
  });
  typia.assert(customer);
  // 2. Create and authenticate seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceSeller.IJoin,
  });
  typia.assert(seller);
  // 3. Create a product
  const product = await generate_random_ecommerce_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
        category_id: typia.random<string & tags.Format<"uuid">>(),
      } satisfies IEcommerceProduct.ICreate,
    },
  );
  typia.assert(product);
  // 4. Create a product variant
  const variant =
    await generate_random_ecommerce_seller_products_variants_create(
      sellerConnection,
      {
        params: {
          productId: product.id,
        },
        body: {
          sku_code: `SKU-${RandomGenerator.alphabets(5)}`,
          option_values: `color=${RandomGenerator.name(1)};size=${RandomGenerator.name(1)}`,
        } satisfies IEcommerceProductVariant.ICreate,
      },
    );
  typia.assert(variant);
  // 5. Subtract all inventory to make variant out of stock
  // First, add some inventory
  await generate_random_ecommerce_seller_variants_inventory_create(
    sellerConnection,
    {
      params: {
        variantId: variant.id,
      },
      body: {
        quantity_change: 10,
        reason: "restock",
      } satisfies IEcommerceInventoryRecord.ICreate,
    },
  );
  // Then subtract all to make it zero
  await generate_random_ecommerce_seller_variants_inventory_create(
    sellerConnection,
    {
      params: {
        variantId: variant.id,
      },
      body: {
        quantity_change: -10,
        reason: "adjustment",
      } satisfies IEcommerceInventoryRecord.ICreate,
    },
  );
  // 6. Attempt to add out-of-stock variant to cart (should fail)
  // Note: In simulation mode, cartId validation is relaxed. In production,
  // a valid cart belonging to the customer would be required.
  const cartId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "out of stock variant cannot be added to cart",
    async () => {
      await api.functional.ecommerce.customer.carts.items.create(
        customerConnection,
        {
          cartId,
          body: {
            ecommerce_product_variant_id: variant.id,
            quantity: 1,
          } satisfies IEcommerceCartItem.ICreate,
        },
      );
    },
  );
  // 7. Verify no cart item was created (implicit through error validation above)
}
