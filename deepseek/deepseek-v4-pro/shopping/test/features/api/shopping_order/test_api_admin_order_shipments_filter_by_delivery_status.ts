import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallShipment";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
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

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_customer_cart_items_create } from "../../../generate/generate_random_shopping_mall_customer_cart_items_create";
import { generate_random_shopping_mall_customer_orders_create } from "../../../generate/generate_random_shopping_mall_customer_orders_create";
import { generate_random_shopping_mall_seller_orders_shipments_create } from "../../../generate/generate_random_shopping_mall_seller_orders_shipments_create";
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
import { prepare_random_shopping_mall_shipment } from "../../../prepare/prepare_random_shopping_mall_shipment";

/**
 * Test that an administrator can filter shipments by delivery status within an order.
 *
 * Validates the shipment listing endpoint's deliveryStatus filter by creating
 * an order with two shipments at different delivery stages and verifying that
 * each filter returns only the matching shipment.
 *
 * 1. Administrator registers and authenticates.
 * 2. Seller registers, gets approved by admin.
 * 3. Seller creates a product with two variants and adds inventory stock.
 * 4. Customer registers, places an order with both variants.
 * 5. Seller creates the first shipment for one order item.
 * 6. Customer confirms delivery of the first shipment, making it "delivered".
 * 7. Seller creates the second shipment for the remaining order item (stays "pending").
 * 8. Admin filters shipments by deliveryStatus "pending" — only the pending shipment is returned.
 * 9. Admin filters shipments by deliveryStatus "delivered" — only the delivered shipment is returned.
 */
export async function test_api_admin_order_shipments_filter_by_delivery_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Seller setup and approval
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {});
  const approvedSeller =
    await api.functional.shoppingMall.admin.sellers.approve(adminConnection, {
      sellerId: seller.id,
    });
  typia.assert(approvedSeller);
  // 3. Seller creates product with two variants
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {},
  );
  typia.assert(product);
  const variant1 =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          initialStockQuantity: 100,
        },
      },
    );
  typia.assert(variant1);
  const variant2 =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          initialStockQuantity: 100,
        },
      },
    );
  typia.assert(variant2);
  // 4. Customer places order
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {});
  const order = await api.functional.shoppingMall.customer.orders.create(
    customerConnection,
    {
      body: {
        items: [
          { variant_id: variant1.id, quantity: 1 },
          { variant_id: variant2.id, quantity: 1 },
        ],
        recipient_name: "Test Recipient",
        phone_number: "01012345678",
        street_address: "123 Test Street",
        city: "Test City",
        state_province: "Test State",
        postal_code: "12345",
        country: "Test Country",
      } satisfies IShoppingMallOrder.ICreate,
    },
  );
  typia.assert(order);
  const orderItem1 = order.items[0];
  const orderItem2 = order.items[1];
  // 5. Seller creates first shipment
  const shipment1 =
    await generate_random_shopping_mall_seller_orders_shipments_create(
      sellerConnection,
      {
        params: { orderId: order.id },
        body: {
          orderItemIds: [orderItem1.id],
          carrier_name: "FedEx",
          tracking_number: "TRACK-001",
        },
      },
    );
  typia.assert(shipment1);
  // 6. Customer confirms delivery of first shipment
  const confirmedShipment1 =
    await api.functional.shoppingMall.customer.shipments.confirm_delivery.confirmDelivery(
      customerConnection,
      { shipmentId: shipment1.id },
    );
  typia.assert(confirmedShipment1);
  // 7. Seller creates second shipment
  const shipment2 =
    await generate_random_shopping_mall_seller_orders_shipments_create(
      sellerConnection,
      {
        params: { orderId: order.id },
        body: {
          orderItemIds: [orderItem2.id],
          carrier_name: "UPS",
          tracking_number: "TRACK-002",
        },
      },
    );
  typia.assert(shipment2);
  // 8. Admin filters by "pending" delivery status
  const pendingResult =
    await api.functional.shoppingMall.admin.orders.shipments.index(
      adminConnection,
      {
        orderId: order.id,
        body: {
          deliveryStatus: "pending",
        } satisfies IShoppingMallShipment.IRequest,
      },
    );
  typia.assert(pendingResult);
  TestValidator.equals(
    "only one pending shipment",
    pendingResult.data.length,
    1,
  );
  const pendingShipment = pendingResult.data[0];
  TestValidator.equals(
    "pending shipment id matches",
    pendingShipment.id,
    shipment2.id,
  );
  TestValidator.equals(
    "pending deliveryStatus",
    pendingShipment.deliveryStatus,
    "pending",
  );
  TestValidator.equals(
    "pending delivered_at is null",
    pendingShipment.delivered_at,
    null,
  );
  TestValidator.equals(
    "pending pagination records",
    pendingResult.pagination.records,
    1,
  );
  // 9. Admin filters by "delivered" delivery status
  const deliveredResult =
    await api.functional.shoppingMall.admin.orders.shipments.index(
      adminConnection,
      {
        orderId: order.id,
        body: {
          deliveryStatus: "delivered",
        } satisfies IShoppingMallShipment.IRequest,
      },
    );
  typia.assert(deliveredResult);
  TestValidator.equals(
    "only one delivered shipment",
    deliveredResult.data.length,
    1,
  );
  const deliveredShipment = deliveredResult.data[0];
  TestValidator.equals(
    "delivered shipment id matches",
    deliveredShipment.id,
    shipment1.id,
  );
  TestValidator.equals(
    "delivered deliveryStatus",
    deliveredShipment.deliveryStatus,
    "delivered",
  );
  TestValidator.predicate(
    "delivered_at is not null",
    deliveredShipment.delivered_at !== null,
  );
  TestValidator.equals(
    "delivered pagination records",
    deliveredResult.pagination.records,
    1,
  );
}
