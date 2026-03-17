import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCartItem";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallOrderItemCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItemCancellationRequest";
import type { IEcommerceMallOrderItemRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItemRefundRequest";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOption";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallOrder";
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
import { generate_random_ecommerce_mall_customer_cart_items_create } from "../../../generate/generate_random_ecommerce_mall_customer_cart_items_create";
import { generate_random_ecommerce_mall_customer_order_items_cancellation_requests_create } from "../../../generate/generate_random_ecommerce_mall_customer_order_items_cancellation_requests_create";
import { generate_random_ecommerce_mall_customer_order_items_refund_requests_create } from "../../../generate/generate_random_ecommerce_mall_customer_order_items_refund_requests_create";
import { generate_random_ecommerce_mall_customer_orders_create } from "../../../generate/generate_random_ecommerce_mall_customer_orders_create";
import { generate_random_ecommerce_mall_seller_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_create";
import { generate_random_ecommerce_mall_seller_products_variants_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_variants_create";
import { generate_random_ecommerce_mall_seller_shipments_create } from "../../../generate/generate_random_ecommerce_mall_seller_shipments_create";
import { prepare_random_ecommerce_mall_cart_item } from "../../../prepare/prepare_random_ecommerce_mall_cart_item";
import { prepare_random_ecommerce_mall_order } from "../../../prepare/prepare_random_ecommerce_mall_order";
import { prepare_random_ecommerce_mall_order_item_cancellation_request } from "../../../prepare/prepare_random_ecommerce_mall_order_item_cancellation_request";
import { prepare_random_ecommerce_mall_order_item_refund_request } from "../../../prepare/prepare_random_ecommerce_mall_order_item_refund_request";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_product_variant } from "../../../prepare/prepare_random_ecommerce_mall_product_variant";
import { prepare_random_ecommerce_mall_shipment } from "../../../prepare/prepare_random_ecommerce_mall_shipment";

/**
 * Test customer order status filtering functionality.
 * Validates that customers can filter their orders by status and that
 * the status filtering correctly reflects the derived order status from order items.
 */
export async function test_api_customer_order_status_filtering(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create seller account and login
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      shop_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: null,
    } satisfies IEcommerceMallSeller.IJoin,
  });
  typia.assert(sellerAuth);
  // 2. Create product with variants (using random category UUID since admin API not available)
  const product = await generate_random_ecommerce_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        category_id: typia.random<string & tags.Format<"uuid">>(),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
      } satisfies IEcommerceMallProduct.ICreate,
    },
  );
  typia.assert(product);
  const variant =
    await generate_random_ecommerce_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          skuCode: RandomGenerator.alphaNumeric(10),
          optionValues: [
            { key: "color", value: "Red" },
            { key: "size", value: "M" },
          ] satisfies IEcommerceMallProductVariantOption[],
          stockQuantity: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<10>
          >(),
        } satisfies IEcommerceMallProductVariant.ICreate,
      },
    );
  typia.assert(variant);
  // 3. Create customer account and login
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: null,
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  typia.assert(customerAuth);
  // 4. Add variant to cart and create order (paid status)
  await generate_random_ecommerce_mall_customer_cart_items_create(
    customerConnection,
    {
      body: {
        product_variant_id: variant.id,
        quantity: 1,
      } satisfies IEcommerceMallCartItem.ICreate,
    },
  );
  const orderPaid = await generate_random_ecommerce_mall_customer_orders_create(
    customerConnection,
    {
      body: {
        shipping_recipient_name: RandomGenerator.name(),
        shipping_phone_number: RandomGenerator.mobile(),
        shipping_street_address: RandomGenerator.paragraph({ sentences: 1 }),
        shipping_city: RandomGenerator.name(),
        shipping_state: RandomGenerator.name(),
        shipping_postal_code: RandomGenerator.alphaNumeric(10),
        shipping_country: "South Korea",
      } satisfies IEcommerceMallOrder.ICreate,
    },
  );
  typia.assert(orderPaid);
  TestValidator.equals("order paid status", orderPaid.status, "paid");
  // 5. Create shipment to change status to shipped
  const shipment = await generate_random_ecommerce_mall_seller_shipments_create(
    sellerConnection,
    {
      body: {
        trackingNumber: RandomGenerator.alphaNumeric(15),
        carrierName: "Korea Post",
        shippedAt: new Date().toISOString() satisfies string &
          tags.Format<"date-time">,
        orderItemIds: orderPaid.order_items.map((item) => item.id),
      } satisfies IEcommerceMallShipment.ICreate,
    },
  );
  typia.assert(shipment);
  // 6. Confirm delivery to change status to delivered
  await api.functional.ecommerceMall.customer.orders.shipments.confirmDelivery(
    customerConnection,
    {
      orderId: orderPaid.id,
      shipmentId: shipment.id,
      body: {},
    },
  );
  // 7. Create second order for cancelled status
  await generate_random_ecommerce_mall_customer_cart_items_create(
    customerConnection,
    {
      body: {
        product_variant_id: variant.id,
        quantity: 1,
      } satisfies IEcommerceMallCartItem.ICreate,
    },
  );
  const orderCancelled =
    await generate_random_ecommerce_mall_customer_orders_create(
      customerConnection,
      {
        body: {
          shipping_recipient_name: RandomGenerator.name(),
          shipping_phone_number: RandomGenerator.mobile(),
          shipping_street_address: RandomGenerator.paragraph({ sentences: 1 }),
          shipping_city: RandomGenerator.name(),
          shipping_state: RandomGenerator.name(),
          shipping_postal_code: RandomGenerator.alphaNumeric(10),
          shipping_country: "South Korea",
        } satisfies IEcommerceMallOrder.ICreate,
      },
    );
  typia.assert(orderCancelled);
  // Request cancellation
  const cancellationRequest =
    await generate_random_ecommerce_mall_customer_order_items_cancellation_requests_create(
      customerConnection,
      {
        params: { orderItemId: orderCancelled.order_items[0].id },
        body: {
          reason: "Changed my mind",
        } satisfies IEcommerceMallOrderItemCancellationRequest.ICreate,
      },
    );
  typia.assert(cancellationRequest);
  // 8. Create third order for refunded status
  await generate_random_ecommerce_mall_customer_cart_items_create(
    customerConnection,
    {
      body: {
        product_variant_id: variant.id,
        quantity: 1,
      } satisfies IEcommerceMallCartItem.ICreate,
    },
  );
  const orderRefunded =
    await generate_random_ecommerce_mall_customer_orders_create(
      customerConnection,
      {
        body: {
          shipping_recipient_name: RandomGenerator.name(),
          shipping_phone_number: RandomGenerator.mobile(),
          shipping_street_address: RandomGenerator.paragraph({ sentences: 1 }),
          shipping_city: RandomGenerator.name(),
          shipping_state: RandomGenerator.name(),
          shipping_postal_code: RandomGenerator.alphaNumeric(10),
          shipping_country: "South Korea",
        } satisfies IEcommerceMallOrder.ICreate,
      },
    );
  typia.assert(orderRefunded);
  // Create shipment and confirm delivery for refunded order
  const shipmentRefunded =
    await generate_random_ecommerce_mall_seller_shipments_create(
      sellerConnection,
      {
        body: {
          trackingNumber: RandomGenerator.alphaNumeric(15),
          carrierName: "CJ Logistics",
          shippedAt: new Date().toISOString() satisfies string &
            tags.Format<"date-time">,
          orderItemIds: orderRefunded.order_items.map((item) => item.id),
        } satisfies IEcommerceMallShipment.ICreate,
      },
    );
  typia.assert(shipmentRefunded);
  await api.functional.ecommerceMall.customer.orders.shipments.confirmDelivery(
    customerConnection,
    {
      orderId: orderRefunded.id,
      shipmentId: shipmentRefunded.id,
      body: {},
    },
  );
  // Request refund
  const refundRequest =
    await generate_random_ecommerce_mall_customer_order_items_refund_requests_create(
      customerConnection,
      {
        params: { orderItemId: orderRefunded.order_items[0].id },
        body: {
          reason: "Product defective",
        } satisfies IEcommerceMallOrderItemRefundRequest.ICreate,
      },
    );
  typia.assert(refundRequest);
  // 9. Test filtering by 'paid' status
  const paidOrders = await api.functional.ecommerceMall.customer.orders.index(
    customerConnection,
    {
      body: {
        status: "paid",
      } satisfies IEcommerceMallOrder.IRequest,
    },
  );
  typia.assert(paidOrders);
  TestValidator.predicate(
    "paid filter returns only paid orders",
    paidOrders.data.every((order) => order.status === "paid"),
  );
  // 10. Test filtering by 'delivered' status
  const deliveredOrders =
    await api.functional.ecommerceMall.customer.orders.index(
      customerConnection,
      {
        body: {
          status: "delivered",
        } satisfies IEcommerceMallOrder.IRequest,
      },
    );
  typia.assert(deliveredOrders);
  TestValidator.predicate(
    "delivered filter returns only delivered orders",
    deliveredOrders.data.every((order) => order.status === "delivered"),
  );
  // 11. Test filtering by 'cancelled' status
  const cancelledOrders =
    await api.functional.ecommerceMall.customer.orders.index(
      customerConnection,
      {
        body: {
          status: "cancelled",
        } satisfies IEcommerceMallOrder.IRequest,
      },
    );
  typia.assert(cancelledOrders);
  TestValidator.predicate(
    "cancelled filter returns only cancelled orders",
    cancelledOrders.data.every((order) => order.status === "cancelled"),
  );
  // 12. Test filtering by 'refunded' status
  const refundedOrders =
    await api.functional.ecommerceMall.customer.orders.index(
      customerConnection,
      {
        body: {
          status: "refunded",
        } satisfies IEcommerceMallOrder.IRequest,
      },
    );
  typia.assert(refundedOrders);
  TestValidator.predicate(
    "refunded filter returns only refunded orders",
    refundedOrders.data.every((order) => order.status === "refunded"),
  );
  // 13. Test filtering with multiple statuses
  const multipleStatusOrders =
    await api.functional.ecommerceMall.customer.orders.index(
      customerConnection,
      {
        body: {
          status: "paid,delivered",
        } satisfies IEcommerceMallOrder.IRequest,
      },
    );
  typia.assert(multipleStatusOrders);
  TestValidator.predicate(
    "multiple status filter returns orders with specified statuses",
    multipleStatusOrders.data.every(
      (order) => order.status === "paid" || order.status === "delivered",
    ),
  );
  // 14. Test status filter combined with date range
  const dateFilteredOrders =
    await api.functional.ecommerceMall.customer.orders.index(
      customerConnection,
      {
        body: {
          status: "delivered",
          dateFrom: new Date(
            Date.now() - 86400000 * 7,
          ).toISOString() satisfies string & tags.Format<"date-time">,
          dateTo: new Date().toISOString() satisfies string &
            tags.Format<"date-time">,
        } satisfies IEcommerceMallOrder.IRequest,
      },
    );
  typia.assert(dateFilteredOrders);
  TestValidator.predicate(
    "date and status filter combination works",
    dateFilteredOrders.data.every(
      (order) =>
        order.status === "delivered" &&
        new Date(order.createdAt) >= new Date(Date.now() - 86400000 * 7),
    ),
  );
  // 15. Test status filter combined with order number search
  const orderNumberFilteredOrders =
    await api.functional.ecommerceMall.customer.orders.index(
      customerConnection,
      {
        body: {
          status: "paid",
          orderNumber: orderPaid.order_number.substring(0, 8),
        } satisfies IEcommerceMallOrder.IRequest,
      },
    );
  typia.assert(orderNumberFilteredOrders);
  TestValidator.predicate(
    "order number and status filter combination works",
    orderNumberFilteredOrders.data.every(
      (order) =>
        order.status === "paid" &&
        order.orderNumber.includes(orderPaid.order_number.substring(0, 8)),
    ),
  );
}
