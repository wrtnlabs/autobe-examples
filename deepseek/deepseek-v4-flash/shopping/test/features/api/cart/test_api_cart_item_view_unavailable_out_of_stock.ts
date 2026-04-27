import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IECommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCartItem";
import type { IECommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCategory";
import type { IECommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomer";
import type { IECommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomerProfile";
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
import { prepare_random_ecommerce_mall_cart_item } from "../../../prepare/prepare_random_ecommerce_mall_cart_item";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_product_variant } from "../../../prepare/prepare_random_ecommerce_mall_product_variant";

/**
 * Test that a cart item is correctly marked as unavailable (is_available=false)
 * when the variant has zero stock.
 *
 * This test validates the complete scenario where a variant with no inventory
 * records (stock=0) is added to a customer's cart. Stock checks occur at
 * checkout, not at add-to-cart time, so the variant can still be added to the
 * cart despite being out of stock. The cart item view should correctly reflect
 * the unavailability status while still displaying all other details such as
 * variant SKU, options, and customer summary.
 *
 * 1. Seller creates a product with base_price=79.99
 * 2. Seller creates a variant with price override of 49.99 (so unit_price comes
 *    from variant, not product base_price), unique SKU, and options (color:
 *    'Blue', size: 'L'), with no inventory records (stock starts at 0)
 * 3. Customer adds the variant to cart with quantity=2
 * 4. Retrieves the cart item via GET endpoint
 * 5. Validates: quantity=2, unit_price=49.99, subtotal=99.98, is_available=false,
 *    variant stock=0, variant SKU and options are fully displayed
 */
export async function test_api_cart_item_view_unavailable_out_of_stock(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller setup
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {});
  // 2. Seller creates a product with base_price=79.99
  const product = await generate_random_e_commerce_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        base_price: 79.99,
        category_id: null,
      } satisfies DeepPartial<IECommerceMallProduct.ICreate>,
    },
  );
  typia.assert(product);
  // 3. Seller creates a variant with price=49.99 (non-null override), options, and NO inventory
  const variant =
    await generate_random_e_commerce_mall_seller_products_variants_create(
      sellerConnection,
      {
        body: {
          price: 49.99,
          options: [
            { key: "color", value: "Blue" },
            { key: "size", value: "L" },
          ] satisfies IECommerceMallProductVariant.IOption[],
        } satisfies DeepPartial<IECommerceMallProductVariant.ICreate>,
        params: { productId: product.id },
      },
    );
  typia.assert(variant);
  // 4. Customer setup
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {});
  typia.assert(customer);
  // 5. Customer adds the 0-stock variant to cart with quantity=2
  const cartItem =
    await generate_random_e_commerce_mall_customer_cart_items_create(
      customerConnection,
      {
        body: {
          product_variant_id: variant.id,
          quantity: 2,
        } satisfies DeepPartial<IECommerceMallCartItem.ICreate>,
      },
    );
  typia.assert(cartItem);
  // 6. Retrieve the cart item by ID via GET
  const cartItemDetail =
    await api.functional.eCommerceMall.customer.cart_items.at(
      customerConnection,
      {
        cartItemId: cartItem.id,
      },
    );
  typia.assert(cartItemDetail);
  // 7. Validate cart item computed fields
  TestValidator.equals("quantity", cartItemDetail.quantity, 2);
  TestValidator.equals(
    "unit_price equals variant price override (49.99, not product base 79.99)",
    cartItemDetail.unit_price,
    49.99,
  );
  TestValidator.equals(
    "subtotal equals 49.99 * 2 = 99.98",
    cartItemDetail.subtotal,
    99.98,
  );
  TestValidator.equals(
    "is_available is false because stock is 0",
    cartItemDetail.is_available,
    false,
  );
  TestValidator.predicate(
    "variant stock is 0",
    () => cartItemDetail.productVariant.stock === 0,
  );
  // 8. Validate variant details are still fully displayed despite unavailability
  TestValidator.equals(
    "variant SKU is displayed",
    cartItemDetail.productVariant.sku_code,
    variant.sku_code,
  );
  TestValidator.predicate(
    "variant options are fully displayed",
    () =>
      cartItemDetail.productVariant.options.length === 2 &&
      cartItemDetail.productVariant.options.some(
        (o) => o.key === "color" && o.value === "Blue",
      ) &&
      cartItemDetail.productVariant.options.some(
        (o) => o.key === "size" && o.value === "L",
      ),
  );
  TestValidator.predicate(
    "customer summary is displayed",
    () => cartItemDetail.customer.id !== undefined,
  );
}
