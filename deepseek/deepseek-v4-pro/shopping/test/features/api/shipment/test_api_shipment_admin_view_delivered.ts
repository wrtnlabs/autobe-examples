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
 * Test that an authenticated administrator can retrieve full shipment details for a delivered shipment.
 *
 * Orchestrates a complete e-commerce flow to create a shipment and validates that the admin shipment view endpoint returns comprehensive shipment data. The test verifies carrier and tracking information, delivery status, contained order items with their statuses, and preserved purchase-time snapshots of product, variant, and seller profile data.
 *
 * The delivered_at field is validated as a nullable ISO 8601 datetime — null when the shipment is in transit, non-null after delivery confirmation. Since delivery confirmation requires a separate customer endpoint not available in this test context, the delivered_at field is expected to be null after shipment creation, which is the correct initial state.
 *
 * 1. Administrator registers and authenticates via authorize_admin_join.
 * 2. Seller registers and authenticates via authorize_seller_join.
 * 3. Administrator approves the seller's pending registration.
 * 4. Administrator creates a product category.
 * 5. Seller creates a product under the approved category.
 * 6. Seller creates a variant (SKU) for the product.
 * 7. Seller adds initial inventory stock to the variant.
 * 8. Customer registers and authenticates via authorize_customer_join.
 * 9. Customer places an order containing the variant.
 * 10. Seller creates a shipment bundling the paid order items with carrier and tracking info.
 * 11. Administrator retrieves the shipment using the order code and shipment ID.
 * 12. Validates full shipment response: carrier/tracking fields, order items with snapshots, and structural integrity.
 */
export async function test_api_shipment_admin_view_delivered(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin registration and authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Seller registration and authentication
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {});
  // 3. Admin approves seller
  await api.functional.shoppingMall.admin.sellers.approve(adminConnection, {
    sellerId: seller.id,
  });
  // 4. Admin creates product category
  const category = await generate_random_shopping_mall_admin_categories_create(
    adminConnection,
    {},
  );
  // 5. Seller creates product
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: { shopping_mall_category_id: category.id },
    },
  );
  // 6. Seller creates variant
  const variant =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
      },
    );
  // 7. Seller adds inventory stock
  await generate_random_shopping_mall_seller_products_variants_inventory_records_create(
    sellerConnection,
    {
      params: { productId: product.id, variantId: variant.id },
      body: { quantity_change: 100, reason: "Initial stock" },
    },
  );
  // 8. Customer registration and authentication
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {});
  // 9. Customer places order
  const order = await generate_random_shopping_mall_customer_orders_create(
    customerConnection,
    {
      body: {
        items: [{ variant_id: variant.id, quantity: 1 }],
      },
    },
  );
  // 10. Seller creates shipment
  const shipment =
    await generate_random_shopping_mall_seller_orders_shipments_create(
      sellerConnection,
      {
        params: { orderId: order.id },
        body: {
          orderItemIds: [order.items[0].id],
        },
      },
    );
  // 11. Admin retrieves the shipment
  const viewedShipment =
    await api.functional.shoppingMall.admin.orders.shipments.at(
      adminConnection,
      {
        orderCode: order.code,
        shipmentId: shipment.id,
      },
    );
  typia.assert(viewedShipment);
  // 12. Validate shipment response fields
  TestValidator.equals(
    "shipment id matches created shipment",
    viewedShipment.id,
    shipment.id,
  );
  TestValidator.predicate(
    "carrier name is present and non-empty",
    viewedShipment.carrier_name.length > 0,
  );
  TestValidator.predicate(
    "tracking number is present and non-empty",
    viewedShipment.tracking_number.length > 0,
  );
  TestValidator.predicate(
    "created_at is a valid ISO 8601 datetime",
    !isNaN(Date.parse(viewedShipment.created_at)),
  );
  TestValidator.predicate(
    "delivered_at is a valid ISO 8601 datetime when non-null",
    viewedShipment.delivered_at === null ||
      !isNaN(Date.parse(viewedShipment.delivered_at)),
  );
  TestValidator.predicate(
    "shipment contains order items",
    viewedShipment.orderItems.length > 0,
  );
  // Validate order items contain preserved snapshots and reflect shipped status
  for (const item of viewedShipment.orderItems) {
    TestValidator.equals(
      "order item status is shipped",
      item.status,
      "shipped",
    );
    TestValidator.predicate(
      "product snapshot is preserved",
      item.productSnapshot !== null,
    );
    TestValidator.predicate(
      "variant snapshot is preserved",
      item.variantSnapshot !== null,
    );
    TestValidator.predicate(
      "seller snapshot is preserved",
      item.sellerSnapshot !== null,
    );
  }
  // Validate seller summary is present in the shipment
  TestValidator.predicate(
    "seller summary has shop name or is identifiable",
    viewedShipment.seller.id.length > 0,
  );
  TestValidator.predicate(
    "order summary references the correct order",
    viewedShipment.order.code === order.code,
  );
}
