import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequest";
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

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_admin_categories_create } from "../../../generate/generate_random_shopping_mall_admin_categories_create";
import { generate_random_shopping_mall_customer_orders_create } from "../../../generate/generate_random_shopping_mall_customer_orders_create";
import { generate_random_shopping_mall_seller_orders_shipments_create } from "../../../generate/generate_random_shopping_mall_seller_orders_shipments_create";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { generate_random_shopping_mall_seller_products_variants_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_create";
import { generate_random_shopping_mall_seller_products_variants_inventory_records_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_inventory_records_create";
import { prepare_random_shopping_mall_category } from "../../../prepare/prepare_random_shopping_mall_category";
import { prepare_random_shopping_mall_inventory_record } from "../../../prepare/prepare_random_shopping_mall_inventory_record";
import { prepare_random_shopping_mall_order } from "../../../prepare/prepare_random_shopping_mall_order";
import { prepare_random_shopping_mall_order_item } from "../../../prepare/prepare_random_shopping_mall_order_item";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";
import { prepare_random_shopping_mall_product_variant_option_value } from "../../../prepare/prepare_random_shopping_mall_product_variant_option_value";
import { prepare_random_shopping_mall_shipment } from "../../../prepare/prepare_random_shopping_mall_shipment";

/**
 * Test seller viewing an in-transit shipment they created for their own order items.
 *
 * Validates that a seller can retrieve full shipment details via the seller shipment
 * retrieval endpoint while the shipment is still in transit (before delivery confirmation).
 * The test covers the complete workflow from seller and customer setup through order
 * placement and shipment creation, then verifies the response contains accurate carrier
 * and tracking information, all included order items with their frozen snapshots,
 * and correct delivery state and seller ownership.
 *
 * 1. Admin registers, creates a category, and approves the seller.
 * 2. Seller registers, creates a product with a purchasable variant and stock.
 * 3. Customer registers and places an order for the variant.
 * 4. Seller creates a shipment grouping the paid order items with carrier details.
 * 5. Seller retrieves the shipment and validates all fields match expectations.
 */
export async function test_api_shipment_seller_view_in_transit(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Seller setup
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {});
  // 3. Admin approves the seller
  await api.functional.shoppingMall.admin.sellers.approve(adminConnection, {
    sellerId: seller.id,
  });
  // 4. Admin creates a category
  const category = await generate_random_shopping_mall_admin_categories_create(
    adminConnection,
    {},
  );
  // 5. Seller creates a product
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        shopping_mall_category_id: category.id,
      },
    },
  );
  // 6. Seller creates a variant with option values and initial stock
  const variant =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          optionValues: [
            { key: "Color", value: "Red" },
            { key: "Size", value: "Large" },
          ],
          initialStockQuantity: 10,
        },
      },
    );
  // 7. Customer setup
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {});
  // 8. Customer places an order
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
  // 9. Seller creates a shipment
  const carrierName = "FedEx";
  const trackingNumber = "TRACK-12345-ABC";
  const shipment =
    await generate_random_shopping_mall_seller_orders_shipments_create(
      sellerConnection,
      {
        params: { orderId: order.id },
        body: {
          orderItemIds: [order.items[0].id],
          carrier_name: carrierName,
          tracking_number: trackingNumber,
        },
      },
    );
  // 10. Seller retrieves the shipment via the target endpoint
  const viewedShipment =
    await api.functional.shoppingMall.seller.orders.shipments.at(
      sellerConnection,
      {
        orderCode: order.code,
        shipmentId: shipment.id,
      },
    );
  typia.assert(viewedShipment);
  // 11. Validate carrier and tracking information
  TestValidator.equals(
    "carrier name",
    viewedShipment.carrier_name,
    carrierName,
  );
  TestValidator.equals(
    "tracking number",
    viewedShipment.tracking_number,
    trackingNumber,
  );
  // 12. Validate delivery status — must be null while in transit
  TestValidator.equals(
    "delivered_at is null (in transit)",
    viewedShipment.delivered_at,
    null,
  );
  // 13. Validate seller ownership
  TestValidator.equals(
    "shipment seller matches authenticated seller",
    viewedShipment.seller.id,
    seller.id,
  );
  // 14. Validate order items are present
  TestValidator.predicate(
    "shipment contains order items",
    viewedShipment.orderItems.length > 0,
  );
  const viewedItem = viewedShipment.orderItems[0];
  // 15. Validate order item quantity
  TestValidator.equals("order item quantity", viewedItem.quantity, 2);
  // 16. Validate product snapshot
  TestValidator.predicate(
    "product snapshot exists",
    viewedItem.productSnapshot !== null,
  );
  if (viewedItem.productSnapshot) {
    TestValidator.predicate(
      "product snapshot has name",
      viewedItem.productSnapshot.name.length > 0,
    );
  }
  // 17. Validate variant snapshot
  TestValidator.predicate(
    "variant snapshot exists",
    viewedItem.variantSnapshot !== null,
  );
  if (viewedItem.variantSnapshot) {
    TestValidator.predicate(
      "variant snapshot has SKU code",
      viewedItem.variantSnapshot.sku_code.length > 0,
    );
    TestValidator.predicate(
      "variant snapshot has option values",
      viewedItem.variantSnapshot.option_values.length > 0,
    );
  }
  // 18. Validate seller snapshot captured at order placement
  TestValidator.predicate(
    "seller snapshot exists",
    viewedItem.sellerSnapshot !== null,
  );
  if (viewedItem.sellerSnapshot) {
    TestValidator.predicate(
      "seller snapshot has shop name",
      viewedItem.sellerSnapshot.shop_name.length > 0,
    );
  }
}
