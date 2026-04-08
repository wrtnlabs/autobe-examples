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
 * Test cart item quantity update fails when the parent product was deleted by the seller.
 *
 * Validates that when a seller deletes a product, cart items referencing that product are automatically removed, and attempting to update such cart items is properly rejected. This test ensures data integrity between products and cart items across the deletion workflow.
 *
 * The test follows this sequence:
 * 1. Create a customer account for cart operations
 * 2. Create a seller account and authenticate
 * 3. Create a product with a variant using utility function
 * 4. Add the variant to customer's cart using utility function
 * 5. Delete the product as the seller
 * 6. Attempt to update the cart item quantity (should fail)
 *
 * Expected behavior:
 * - Cart item should be automatically removed when product is deleted
 * - Update operation should fail with appropriate error (404 or 400)
 * - No partial state or orphaned cart items should remain
 */
export async function test_api_cart_item_quantity_update_product_deleted(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create customer account
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceCustomer.IJoin,
  });
  typia.assert(customer);
  // 2. Create seller account
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceSeller.IJoin,
  });
  typia.assert(seller);
  // 3. Create product with variant using utility function
  // Note: The utility function will handle category creation or use existing categories
  const product = await generate_random_ecommerce_seller_products_create(
    sellerConnection,
    {
      body: {
        variants: [
          {
            sku_code: "SKU-" + RandomGenerator.alphabets(5).toUpperCase(),
            option_values: "color=Red;size=Large",
            price: typia.random<
              number & tags.Type<"uint32"> & tags.Minimum<1000>
            >(),
          } satisfies IEcommerceProductVariant.ICreate,
        ],
      },
    },
  );
  typia.assert(product);
  // Get the variant ID
  const variantId = product.variants[0].id;
  // 4. Add variant to customer's cart using utility function
  // Cart ID is typically the customer's ID in this system
  const cartId = customer.id;
  const cartItem = await generate_random_ecommerce_customer_carts_items_create(
    customerConnection,
    {
      params: { cartId },
      body: {
        ecommerce_product_variant_id: variantId,
        quantity: 1,
      } satisfies IEcommerceCartItem.ICreate,
    },
  );
  typia.assert(cartItem);
  const cartItemId = cartItem.id;
  // 5. Delete the product as seller
  await api.functional.ecommerce.seller.products.erase(sellerConnection, {
    productId: product.id,
  });
  // 6. Attempt to update the cart item quantity (should fail)
  // The cart item should have been auto-removed when product was deleted
  await TestValidator.error(
    "cart item update should fail after product deletion",
    async () => {
      await api.functional.ecommerce.customer.carts.items.putByCartidAndItemid(
        customerConnection,
        {
          cartId,
          itemId: cartItemId,
          body: {
            quantity: 2,
          } satisfies IEcommerceCartItem.IUpdate,
        },
      );
    },
  );
}
