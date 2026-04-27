import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IECommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCancellationRequest";
import type { IECommerceMallCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCancellationRequestSnapshot";
import type { IECommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCartItem";
import type { IECommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCategory";
import type { IECommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomer";
import type { IECommerceMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomerAddress";
import type { IECommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomerProfile";
import type { IECommerceMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallInventoryRecord";
import type { IECommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallOrder";
import type { IECommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallOrderItem";
import type { IECommerceMallOrderItemSellerSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallOrderItemSellerSnapshot";
import type { IECommerceMallOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallOrderItemSnapshot";
import type { IECommerceMallOrderItemStatusLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallOrderItemStatusLog";
import type { IECommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProduct";
import type { IECommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProductImage";
import type { IECommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProductVariant";
import type { IECommerceMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProductVariantOption";
import type { IECommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallRefundRequest";
import type { IECommerceMallRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallRefundRequestSnapshot";
import type { IECommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallReview";
import type { IECommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSeller";
import type { IECommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSellerProfile";
import type { IECommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallShipment";
import type { IECommerceMallShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallShipmentItem";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIECommerceMallOrderItemStatusLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIECommerceMallOrderItemStatusLog";
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
import { generate_random_e_commerce_mall_customer_addresses_create } from "../../../generate/generate_random_e_commerce_mall_customer_addresses_create";
import { generate_random_e_commerce_mall_customer_cart_items_create } from "../../../generate/generate_random_e_commerce_mall_customer_cart_items_create";
import { generate_random_e_commerce_mall_customer_orders_create } from "../../../generate/generate_random_e_commerce_mall_customer_orders_create";
import { generate_random_e_commerce_mall_seller_products_create } from "../../../generate/generate_random_e_commerce_mall_seller_products_create";
import { generate_random_e_commerce_mall_seller_products_variants_create } from "../../../generate/generate_random_e_commerce_mall_seller_products_variants_create";
import { generate_random_e_commerce_mall_seller_products_variants_inventory_create } from "../../../generate/generate_random_e_commerce_mall_seller_products_variants_inventory_create";
import { generate_random_e_commerce_mall_seller_shipments_create } from "../../../generate/generate_random_e_commerce_mall_seller_shipments_create";
import { prepare_random_ecommerce_mall_cart_item } from "../../../prepare/prepare_random_ecommerce_mall_cart_item";
import { prepare_random_ecommerce_mall_customer_address } from "../../../prepare/prepare_random_ecommerce_mall_customer_address";
import { prepare_random_ecommerce_mall_inventory_record } from "../../../prepare/prepare_random_ecommerce_mall_inventory_record";
import { prepare_random_ecommerce_mall_order } from "../../../prepare/prepare_random_ecommerce_mall_order";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_product_variant } from "../../../prepare/prepare_random_ecommerce_mall_product_variant";
import { prepare_random_ecommerce_mall_shipment } from "../../../prepare/prepare_random_ecommerce_mall_shipment";

export async function test_api_order_item_status_log_full_fulfillment_lifecycle(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup actor connections
  const customerConnection: api.IConnection = { host: connection.host };
  const sellerConnection: api.IConnection = { host: connection.host };
  // 2. Register customer and seller
  const customerAuth = await authorize_customer_join(customerConnection, {});
  typia.assert(customerAuth);
  const sellerAuth = await authorize_seller_join(sellerConnection, {});
  typia.assert(sellerAuth);
  // 3. Seller creates a product
  const product = await generate_random_e_commerce_mall_seller_products_create(
    sellerConnection,
    {},
  );
  typia.assert(product);
  // 4. Seller creates a variant
  const variant =
    await generate_random_e_commerce_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          options: [
            { key: "color", value: "Red" },
            { key: "size", value: "Large" },
          ],
        },
      },
    );
  typia.assert(variant);
  // 5. Seller restocks inventory
  const inventoryRecord =
    await generate_random_e_commerce_mall_seller_products_variants_inventory_create(
      sellerConnection,
      {
        params: { productId: product.id, variantId: variant.id },
        body: {
          quantity_change: 100,
          reason: "initial restock",
        },
      },
    );
  typia.assert(inventoryRecord);
  // 6. Customer creates a shipping address
  const address =
    await generate_random_e_commerce_mall_customer_addresses_create(
      customerConnection,
      {},
    );
  typia.assert(address);
  // 7. Customer adds variant to cart
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
  // 8. Customer places order
  const order = await generate_random_e_commerce_mall_customer_orders_create(
    customerConnection,
    {
      body: {
        addressId: address.id,
      },
    },
  );
  typia.assert(order);
  const orderItem = order.orderItems[0]!;
  const orderItemId = orderItem.id;
  // Record the order creation time for date range filtering
  const orderCreatedAt = order.createdAt;
  // 9. Seller creates a shipment for the paid order item
  const shipment =
    await generate_random_e_commerce_mall_seller_shipments_create(
      sellerConnection,
      {
        body: {
          carrierName: RandomGenerator.alphaNumeric(8),
          trackingNumber: RandomGenerator.alphaNumeric(16),
          orderItemIds: [orderItemId],
        },
      },
    );
  typia.assert(shipment);
  // 10. Customer confirms delivery
  const confirmedShipment =
    await api.functional.eCommerceMall.customer.shipments.confirm_delivery.confirmDelivery(
      customerConnection,
      {
        shipmentId: shipment.id,
      },
    );
  typia.assert(confirmedShipment);
  // ===== Test 11: Default pagination - 3 status log entries =====
  const defaultResult =
    await api.functional.eCommerceMall.customer.orderItems.statusLogs.index(
      customerConnection,
      {
        itemId: orderItemId,
        body: {},
      },
    );
  typia.assert(defaultResult);
  TestValidator.equals(
    "pagination record count",
    defaultResult.pagination.records,
    3,
  );
  TestValidator.equals("pagination pages", defaultResult.pagination.pages, 1);
  TestValidator.equals(
    "pagination current page",
    defaultResult.pagination.current,
    1,
  );
  TestValidator.equals("status log entry count", defaultResult.data.length, 3);
  // Verify newest first ordering
  // Entry 0: delivered (newest)
  TestValidator.equals(
    "entry 0 from_status",
    defaultResult.data[0]!.from_status,
    "shipped",
  );
  TestValidator.equals(
    "entry 0 to_status",
    defaultResult.data[0]!.to_status,
    "delivered",
  );
  TestValidator.equals(
    "entry 0 reason",
    defaultResult.data[0]!.reason,
    "customer_delivery_confirmation",
  );
  typia.assert(defaultResult.data[0]!.id);
  typia.assert(defaultResult.data[0]!.created_at);
  // Entry 1: shipped
  TestValidator.equals(
    "entry 1 from_status",
    defaultResult.data[1]!.from_status,
    "paid",
  );
  TestValidator.equals(
    "entry 1 to_status",
    defaultResult.data[1]!.to_status,
    "shipped",
  );
  TestValidator.equals(
    "entry 1 reason",
    defaultResult.data[1]!.reason,
    "shipment_created",
  );
  typia.assert(defaultResult.data[1]!.id);
  typia.assert(defaultResult.data[1]!.created_at);
  // Entry 2: paid (oldest)
  TestValidator.equals(
    "entry 2 from_status",
    defaultResult.data[2]!.from_status,
    null,
  );
  TestValidator.equals(
    "entry 2 to_status",
    defaultResult.data[2]!.to_status,
    "paid",
  );
  TestValidator.equals("entry 2 reason", defaultResult.data[2]!.reason, null);
  typia.assert(defaultResult.data[2]!.id);
  typia.assert(defaultResult.data[2]!.created_at);
  // ===== Test 12: Filter by to_status='shipped' =====
  const shippedResult =
    await api.functional.eCommerceMall.customer.orderItems.statusLogs.index(
      customerConnection,
      {
        itemId: orderItemId,
        body: {
          to_status: "shipped",
        },
      },
    );
  typia.assert(shippedResult);
  TestValidator.equals(
    "filtered to_status count",
    shippedResult.data.length,
    1,
  );
  TestValidator.equals(
    "filtered to_status value",
    shippedResult.data[0]!.to_status,
    "shipped",
  );
  // ===== Test 13: Filter by reason LIKE 'shipment' =====
  const reasonResult =
    await api.functional.eCommerceMall.customer.orderItems.statusLogs.index(
      customerConnection,
      {
        itemId: orderItemId,
        body: {
          reason: "shipment",
        },
      },
    );
  typia.assert(reasonResult);
  TestValidator.equals("filtered reason count", reasonResult.data.length, 1);
  TestValidator.equals(
    "filtered reason value",
    reasonResult.data[0]!.reason,
    "shipment_created",
  );
  // ===== Test 14: Pagination with page=1, limit=2 =====
  const paginatedResult =
    await api.functional.eCommerceMall.customer.orderItems.statusLogs.index(
      customerConnection,
      {
        itemId: orderItemId,
        body: {
          page: 1,
          limit: 2,
        },
      },
    );
  typia.assert(paginatedResult);
  TestValidator.equals("paginated data count", paginatedResult.data.length, 2);
  TestValidator.equals(
    "paginated records total",
    paginatedResult.pagination.records,
    3,
  );
  TestValidator.equals(
    "paginated pages total",
    paginatedResult.pagination.pages,
    2,
  );
  TestValidator.equals(
    "paginated current page",
    paginatedResult.pagination.current,
    1,
  );
  // ===== Test 15: Date range filtering =====
  const now = new Date().toISOString();
  const dateRangeResult =
    await api.functional.eCommerceMall.customer.orderItems.statusLogs.index(
      customerConnection,
      {
        itemId: orderItemId,
        body: {
          created_at_from: orderCreatedAt,
          created_at_to: now,
        },
      },
    );
  typia.assert(dateRangeResult);
  TestValidator.equals(
    "date range records",
    dateRangeResult.pagination.records,
    3,
  );
  // ===== Test 16: 404 with non-existent UUID =====
  const fakeId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "404 on non-existent order item",
    404,
    async () => {
      await api.functional.eCommerceMall.customer.orderItems.statusLogs.index(
        customerConnection,
        {
          itemId: fakeId,
          body: {},
        },
      );
    },
  );
  // ===== Test 17: Seller can also view status logs =====
  const sellerResult =
    await api.functional.eCommerceMall.customer.orderItems.statusLogs.index(
      sellerConnection,
      {
        itemId: orderItemId,
        body: {},
      },
    );
  typia.assert(sellerResult);
  TestValidator.equals(
    "seller can view logs",
    sellerResult.pagination.records,
    3,
  );
  // ===== Test 18: Different customer cannot view =====
  const otherCustomerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(otherCustomerConnection, {});
  await TestValidator.httpError(
    "different customer gets auth denial",
    [403, 404],
    async () => {
      await api.functional.eCommerceMall.customer.orderItems.statusLogs.index(
        otherCustomerConnection,
        {
          itemId: orderItemId,
          body: {},
        },
      );
    },
  );
}
