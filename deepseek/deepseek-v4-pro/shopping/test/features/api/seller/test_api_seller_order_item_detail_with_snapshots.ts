import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequest";
import type { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryRecord";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallOrderItemProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemProductSnapshot";
import type { IShoppingMallOrderItemProductSnapshotImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemProductSnapshotImage";
import type { IShoppingMallOrderItemSellerSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSellerSnapshot";
import type { IShoppingMallOrderItemVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemVariantSnapshot";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOptionValue";
import type { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
import type { IShoppingMallReviewReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReviewReview";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
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
import { generate_random_shopping_mall_customer_cart_items_create } from "../../../generate/generate_random_shopping_mall_customer_cart_items_create";
import { generate_random_shopping_mall_customer_orders_create } from "../../../generate/generate_random_shopping_mall_customer_orders_create";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { generate_random_shopping_mall_seller_products_variants_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_create";
import { generate_random_shopping_mall_seller_products_variants_inventory_records_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_inventory_records_create";
import { prepare_random_shopping_mall_cart_item } from "../../../prepare/prepare_random_shopping_mall_cart_item";
import { prepare_random_shopping_mall_inventory_record } from "../../../prepare/prepare_random_shopping_mall_inventory_record";
import { prepare_random_shopping_mall_order } from "../../../prepare/prepare_random_shopping_mall_order";
import { prepare_random_shopping_mall_order_item } from "../../../prepare/prepare_random_shopping_mall_order_item";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";
import { prepare_random_shopping_mall_product_variant_option_value } from "../../../prepare/prepare_random_shopping_mall_product_variant_option_value";

/**
 * Test seller order item detail retrieval with all three purchase-time snapshots.
 *
 * Validates that a seller can retrieve the complete detail of an order item for a product
 * they own, verifying all three purchase-time snapshots — product, variant, and seller —
 * are present and accurately reflect the state at order placement time.
 *
 * The test confirms that the order item's quantity, unit price, and status ('paid') match
 * the original purchase. The cancellation_requests and refund_requests arrays are empty
 * since no requests have been submitted, and the shipment field is null since the item has
 * not been shipped yet.
 *
 * 1. A seller registers, creates a product with a category, adds a variant with option
 *    values, and stocks inventory with 10 units.
 * 2. A customer registers, adds the variant to their cart with quantity 2, and places
 *    an order containing the variant.
 * 3. The seller retrieves the order item detail by ID.
 * 4. Validates core fields: quantity is 2, status is "paid", price is positive.
 * 5. Validates product snapshot: name, description, base_price, and category_name match
 *    the originally created product, and snapshot images array is present.
 * 6. Validates variant snapshot: SKU code matches the variant's code, option_values is a
 *    non-empty denormalized string of key-value pairs, and frozen price matches the order
 *    item's price.
 * 7. Validates seller snapshot: shop_name is non-empty and logo_image_url is present
 *    (may be null if no logo was set).
 * 8. Validates cancellation_requests and refund_requests are empty, and shipment is null.
 */
export async function test_api_seller_order_item_detail_with_snapshots(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller registration and authentication
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {});
  // 2. Create product under the seller's ownership
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {},
  );
  typia.assert(product);
  // 3. Create a purchasable variant (SKU) with option values
  const variant =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
      },
    );
  typia.assert(variant);
  // 4. Add positive stock so the variant can be purchased
  await generate_random_shopping_mall_seller_products_variants_inventory_records_create(
    sellerConnection,
    {
      body: {
        quantity_change: 10,
        reason: "Initial stock for E2E test",
      },
      params: {
        productId: product.id,
        variantId: variant.id,
      },
    },
  );
  // 5. Customer registration and authentication
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {});
  // 6. Add the variant to the customer's cart
  const cartItem =
    await generate_random_shopping_mall_customer_cart_items_create(
      customerConnection,
      {
        body: {
          productVariantId: variant.id,
          quantity: 2,
        },
      },
    );
  typia.assert(cartItem);
  // 7. Place the order containing the seller's product variant
  const order = await generate_random_shopping_mall_customer_orders_create(
    customerConnection,
    {
      body: {
        items: [
          {
            variant_id: variant.id,
            quantity: 2,
          },
        ],
      },
    },
  );
  typia.assert(order);
  const orderItemId = order.items[0].id;
  // 8. Seller retrieves the order item detail
  const orderItem = await api.functional.shoppingMall.seller.order_items.at(
    sellerConnection,
    { itemId: orderItemId },
  );
  typia.assert(orderItem);
  // 9. Validate core order item fields
  TestValidator.equals("quantity", orderItem.quantity, 2);
  TestValidator.equals("status is paid", orderItem.status, "paid");
  TestValidator.predicate("price is positive", orderItem.price > 0);
  // 10. Validate product snapshot
  const productSnapshot = orderItem.productSnapshot;
  TestValidator.predicate("product snapshot exists", productSnapshot !== null);
  if (productSnapshot) {
    TestValidator.equals(
      "product snapshot name",
      productSnapshot.name,
      product.name,
    );
    TestValidator.equals(
      "product snapshot description",
      productSnapshot.description,
      product.description,
    );
    TestValidator.equals(
      "product snapshot base_price",
      productSnapshot.base_price,
      product.base_price,
    );
    TestValidator.equals(
      "product snapshot category_name",
      productSnapshot.category_name,
      product.category.name,
    );
    TestValidator.predicate(
      "product snapshot images array exists",
      Array.isArray(productSnapshot.productSnapshotImages),
    );
  }
  // 11. Validate variant snapshot
  const variantSnapshot = orderItem.variantSnapshot;
  TestValidator.predicate("variant snapshot exists", variantSnapshot !== null);
  if (variantSnapshot) {
    TestValidator.equals(
      "variant snapshot sku_code",
      variantSnapshot.sku_code,
      variant.code,
    );
    TestValidator.predicate(
      "variant snapshot option_values not empty",
      variantSnapshot.option_values.length > 0,
    );
    TestValidator.equals(
      "variant snapshot price matches item price",
      variantSnapshot.price,
      orderItem.price,
    );
    // Verify option_values contains the expected denormalized key-value pairs
    const expectedOptionValues = variant.optionValues
      .map((ov) => `${ov.key}: ${ov.value}`)
      .join(", ");
    TestValidator.equals(
      "variant snapshot option_values match variant options",
      variantSnapshot.option_values,
      expectedOptionValues,
    );
  }
  // 12. Validate seller snapshot
  const sellerSnapshot = orderItem.sellerSnapshot;
  TestValidator.predicate("seller snapshot exists", sellerSnapshot !== null);
  if (sellerSnapshot) {
    TestValidator.predicate(
      "seller snapshot shop_name non-empty",
      sellerSnapshot.shop_name.length > 0,
    );
  }
  // 13. Validate cancellation and refund requests are empty
  TestValidator.equals(
    "cancellation requests empty",
    orderItem.cancellationRequests.length,
    0,
  );
  TestValidator.equals(
    "refund requests empty",
    orderItem.refundRequests.length,
    0,
  );
  // 14. Validate shipment is null (not yet shipped)
  TestValidator.equals("shipment is null", orderItem.shipment, null);
}
