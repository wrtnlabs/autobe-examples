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

export async function test_api_customer_cart_items_list_with_pricing_and_availability(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register customer
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {});
  // 2. Register seller and create product
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {});
  const product = await generate_random_e_commerce_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        category_id: null,
      },
    },
  );
  typia.assert(product);
  // 3. Create variant A (color: Red, size: Large)
  const variantA =
    await generate_random_e_commerce_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          sku_code: `TEST-RED-L-${RandomGenerator.alphaNumeric(8)}`,
          options: [
            { key: "color", value: "Red" },
            { key: "size", value: "Large" },
          ],
        },
      },
    );
  typia.assert(variantA);
  // 4. Create variant B (color: Blue, size: Small)
  const variantB =
    await generate_random_e_commerce_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          sku_code: `TEST-BLUE-S-${RandomGenerator.alphaNumeric(8)}`,
          options: [
            { key: "color", value: "Blue" },
            { key: "size", value: "Small" },
          ],
        },
      },
    );
  typia.assert(variantB);
  // 5. Add inventory to variant A (100 units)
  await generate_random_e_commerce_mall_seller_products_variants_inventory_create(
    sellerConnection,
    {
      params: { productId: product.id, variantId: variantA.id },
      body: {
        quantity_change: 100,
        reason: "initial stock",
      },
    },
  );
  // 6. Add inventory to variant B (50 units)
  await generate_random_e_commerce_mall_seller_products_variants_inventory_create(
    sellerConnection,
    {
      params: { productId: product.id, variantId: variantB.id },
      body: {
        quantity_change: 50,
        reason: "initial stock",
      },
    },
  );
  // 7. Customer adds variant A (qty: 2) to cart
  const cartItemA =
    await generate_random_e_commerce_mall_customer_cart_items_create(
      customerConnection,
      {
        body: {
          product_variant_id: variantA.id,
          quantity: 2,
        },
      },
    );
  typia.assert(cartItemA);
  // 8. Customer adds variant B (qty: 1) to cart
  const cartItemB =
    await generate_random_e_commerce_mall_customer_cart_items_create(
      customerConnection,
      {
        body: {
          product_variant_id: variantB.id,
          quantity: 1,
        },
      },
    );
  typia.assert(cartItemB);
  // 9. Call PATCH /customer/cart-items to retrieve the cart
  const page = await api.functional.eCommerceMall.customer.cart_items.index(
    customerConnection,
    {
      body: {
        page: 1,
        limit: 20,
      } satisfies IECommerceMallCartItem.IRequest,
    },
  );
  typia.assert(page);
  // 10. Validate pagination metadata
  TestValidator.equals("pagination current", page.pagination.current, 1);
  TestValidator.equals("pagination limit", page.pagination.limit, 20);
  TestValidator.predicate("records >= 2", page.pagination.records >= 2);
  TestValidator.predicate("pages >= 1", page.pagination.pages >= 1);
  // 11. Validate cart has 2 items
  TestValidator.equals("cart items count", page.data.length, 2);
  // 12. Items sorted by created_at DESC (newest first)
  //    variant B (Blue/Small) added last -> first item
  //    variant A (Red/Large) added first -> second item
  const firstItem = page.data[0]!;
  const secondItem = page.data[1]!;
  // 13. Validate first item (variant B - Blue/Small, qty: 1)
  typia.assertGuard(firstItem);
  TestValidator.equals(
    "first item variant id",
    firstItem.variant.id,
    variantB.id,
  );
  TestValidator.equals("first item quantity", firstItem.quantity, 1);
  TestValidator.predicate(
    "first item unit_price > 0",
    firstItem.unit_price > 0,
  );
  TestValidator.equals(
    "first item subtotal",
    firstItem.subtotal,
    firstItem.unit_price * firstItem.quantity,
  );
  TestValidator.equals(
    "first item availability",
    firstItem.availability,
    "available" as const,
  );
  TestValidator.equals(
    "first item stock_warning",
    firstItem.stock_warning,
    false,
  );
  TestValidator.predicate(
    "first item available_stock >= 0",
    firstItem.available_stock >= 0,
  );
  TestValidator.equals(
    "first item variant sku_code",
    firstItem.variant.sku_code,
    variantB.sku_code,
  );
  TestValidator.predicate(
    "first item variant options color",
    firstItem.variant.options.color === "Blue",
  );
  TestValidator.predicate(
    "first item variant options size",
    firstItem.variant.options.size === "Small",
  );
  TestValidator.predicate(
    "first item variant stock > 0",
    firstItem.variant.stock > 0,
  );
  TestValidator.predicate(
    "first item variant effective_price > 0",
    firstItem.variant.effective_price > 0,
  );
  // 14. Validate second item (variant A - Red/Large, qty: 2)
  typia.assertGuard(secondItem);
  TestValidator.equals(
    "second item variant id",
    secondItem.variant.id,
    variantA.id,
  );
  TestValidator.equals("second item quantity", secondItem.quantity, 2);
  TestValidator.predicate(
    "second item unit_price > 0",
    secondItem.unit_price > 0,
  );
  TestValidator.equals(
    "second item subtotal",
    secondItem.subtotal,
    secondItem.unit_price * secondItem.quantity,
  );
  TestValidator.equals(
    "second item availability",
    secondItem.availability,
    "available" as const,
  );
  TestValidator.equals(
    "second item stock_warning",
    secondItem.stock_warning,
    false,
  );
  TestValidator.predicate(
    "second item available_stock >= 0",
    secondItem.available_stock >= 0,
  );
  TestValidator.equals(
    "second item variant sku_code",
    secondItem.variant.sku_code,
    variantA.sku_code,
  );
  TestValidator.predicate(
    "second item variant options color",
    secondItem.variant.options.color === "Red",
  );
  TestValidator.predicate(
    "second item variant options size",
    secondItem.variant.options.size === "Large",
  );
  TestValidator.predicate(
    "second item variant stock > 0",
    secondItem.variant.stock > 0,
  );
  TestValidator.predicate(
    "second item variant effective_price > 0",
    secondItem.variant.effective_price > 0,
  );
  // 15. Verify created_at is valid ISO datetime
  TestValidator.predicate(
    "first item created_at valid",
    !isNaN(Date.parse(firstItem.created_at)),
  );
  TestValidator.predicate(
    "second item created_at valid",
    !isNaN(Date.parse(secondItem.created_at)),
  );
  // 16. Verify product reference in variant summary
  TestValidator.equals(
    "first item product id",
    firstItem.variant.product.id,
    product.id,
  );
  TestValidator.equals(
    "second item product id",
    secondItem.variant.product.id,
    product.id,
  );
}
