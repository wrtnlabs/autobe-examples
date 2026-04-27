import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IECommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCartItem";
import type { IECommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCategory";
import type { IECommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomer";
import type { IECommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomerProfile";
import type { IECommerceMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallInventoryRecord";
import type { IECommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallOrder";
import type { IECommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallOrderItem";
import type { IECommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProduct";
import type { IECommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProductImage";
import type { IECommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProductVariant";
import type { IECommerceMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProductVariantOption";
import type { IECommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallReview";
import type { IECommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSeller";
import type { IECommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSellerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIECommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIECommerceMallCartItem";
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
import { generate_random_e_commerce_mall_customer_cart_items_create } from "../../../generate/generate_random_e_commerce_mall_customer_cart_items_create";
import { generate_random_e_commerce_mall_seller_products_create } from "../../../generate/generate_random_e_commerce_mall_seller_products_create";
import { generate_random_e_commerce_mall_seller_products_variants_create } from "../../../generate/generate_random_e_commerce_mall_seller_products_variants_create";
import { generate_random_e_commerce_mall_seller_products_variants_inventory_create } from "../../../generate/generate_random_e_commerce_mall_seller_products_variants_inventory_create";
import { prepare_random_ecommerce_mall_cart_item } from "../../../prepare/prepare_random_ecommerce_mall_cart_item";
import { prepare_random_ecommerce_mall_inventory_record } from "../../../prepare/prepare_random_ecommerce_mall_inventory_record";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_product_variant } from "../../../prepare/prepare_random_ecommerce_mall_product_variant";

/**
 * Test that a cart item whose product variant has been soft-deleted by the seller is marked as 'unavailable' in the cart listing.
 *
 * Validates the business rule that when a seller deletes a variant, any cart items referencing that variant are preserved in the customer's cart but marked as unavailable for checkout.
 *
 * 1. Customer registers and authenticates on the platform.
 * 2. Seller registers and authenticates on the platform.
 * 3. Seller creates a product with a valid base price.
 * 4. Seller creates a variant (SKU) under that product with option values.
 * 5. Seller adds 10 units of stock to the variant with reason 'initial stock'.
 * 6. Customer adds the variant (quantity: 1) to their shopping cart.
 * 7. Seller soft-deletes the variant via the delete endpoint.
 * 8. Customer retrieves their cart items via the paginated listing endpoint.
 * 9. Validates that the cart item remains in the cart with:
 *    - quantity preserved (1)
 *    - availability set to 'unavailable'
 *    - stock_warning set to false
 *    - variant reference still present (id, sku_code, options)
 *    - created_at timestamp present
 */
export async function test_api_customer_cart_items_unavailable_variant_after_deletion(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer setup
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {});
  // 2. Seller setup
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {});
  // 3. Seller creates a product
  const product = await generate_random_e_commerce_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        category_id: null,
      },
    },
  );
  typia.assert(product);
  // 4. Seller creates a variant (SKU)
  const variant =
    await generate_random_e_commerce_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
      },
    );
  typia.assert(variant);
  // 5. Seller adds stock (10 units)
  const inventory =
    await generate_random_e_commerce_mall_seller_products_variants_inventory_create(
      sellerConnection,
      {
        body: {
          quantity_change: 10,
          reason: "initial stock",
        },
        params: {
          productId: product.id,
          variantId: variant.id,
        },
      },
    );
  typia.assert(inventory);
  // 6. Customer adds variant to cart (quantity: 1)
  const cartItem =
    await generate_random_e_commerce_mall_customer_cart_items_create(
      customerConnection,
      {
        body: {
          product_variant_id: variant.id,
          quantity: 1,
        },
      },
    );
  typia.assert(cartItem);
  // 7. Seller soft-deletes the variant
  await api.functional.eCommerceMall.seller.products.variants.erase(
    sellerConnection,
    {
      productId: product.id,
      variantId: variant.id,
    },
  );
  // 8. Customer views cart
  const cart = await api.functional.eCommerceMall.customer.cart_items.index(
    customerConnection,
    {
      body: {
        page: 1,
        limit: 20,
      } satisfies IECommerceMallCartItem.IRequest,
    },
  );
  typia.assert(cart);
  // 9. Validate cart item is marked as unavailable
  TestValidator.equals("cart has 1 item", cart.data.length, 1);
  const item = cart.data[0]!;
  TestValidator.equals(
    "availability is unavailable",
    item.availability,
    "unavailable",
  );
  TestValidator.equals("stock_warning is false", item.stock_warning, false);
  TestValidator.equals("variant id matches", item.variant.id, variant.id);
  TestValidator.equals("quantity is preserved", item.quantity, 1);
  TestValidator.predicate(
    "created_at is present",
    typeof item.created_at === "string",
  );
  TestValidator.equals(
    "available_stock is 0 after deletion",
    item.available_stock,
    0,
  );
}
