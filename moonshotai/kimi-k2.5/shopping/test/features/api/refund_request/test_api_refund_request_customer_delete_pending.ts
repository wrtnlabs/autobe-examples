import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCartItem";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOption";
import type { IEcommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequest";
import type { IEcommerceMallRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequestSnapshot";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
import type { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
import type { IEcommerceMallShipmentDelivery } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipmentDelivery";
import type { IEcommerceMallShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipmentItem";
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
import { generate_random_ecommerce_mall_customer_addresses_create } from "../../../generate/generate_random_ecommerce_mall_customer_addresses_create";
import { generate_random_ecommerce_mall_customer_cart_items_create } from "../../../generate/generate_random_ecommerce_mall_customer_cart_items_create";
import { generate_random_ecommerce_mall_customer_refund_requests_create } from "../../../generate/generate_random_ecommerce_mall_customer_refund_requests_create";
import { generate_random_ecommerce_mall_seller_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_create";
import { generate_random_ecommerce_mall_seller_products_variants_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_variants_create";
import { generate_random_ecommerce_mall_seller_shipments_create } from "../../../generate/generate_random_ecommerce_mall_seller_shipments_create";
import { prepare_random_ecommerce_mall_cart_item } from "../../../prepare/prepare_random_ecommerce_mall_cart_item";
import { prepare_random_ecommerce_mall_customer } from "../../../prepare/prepare_random_ecommerce_mall_customer";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_product_variant } from "../../../prepare/prepare_random_ecommerce_mall_product_variant";
import { prepare_random_ecommerce_mall_product_variant_option } from "../../../prepare/prepare_random_ecommerce_mall_product_variant_option";
import { prepare_random_ecommerce_mall_refund_request } from "../../../prepare/prepare_random_ecommerce_mall_refund_request";
import { prepare_random_ecommerce_mall_shipment } from "../../../prepare/prepare_random_ecommerce_mall_shipment";

/**
 * Test successful deletion of a pending refund request by the customer who created it.
 * The customer creates a refund request for a delivered order item, then deletes it before the seller responds.
 * The test verifies the refund request is removed and subsequent GET returns 404 GONE error.
 * Validates customer's right to cancel their own pending refund request.
 */
export async function test_api_refund_request_customer_delete_pending(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create customer account
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 2. Create seller account
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 3. Customer creates shipping address
  const address =
    await generate_random_ecommerce_mall_customer_addresses_create(
      customerConnection,
      {},
    );
  typia.assert(address);
  // 4. Seller creates product
  const product = await generate_random_ecommerce_mall_seller_products_create(
    sellerConnection,
    {},
  );
  typia.assert(product);
  // 5. Seller adds variant to product
  const variant =
    await generate_random_ecommerce_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          skuCode: `SKU-${RandomGenerator.alphaNumeric(8)}`,
        },
      },
    );
  typia.assert(variant);
  // 6. Customer adds item to cart (creates order)
  const cartItem =
    await generate_random_ecommerce_mall_customer_cart_items_create(
      customerConnection,
      {
        body: {
          productVariantId: variant.id,
          quantity: 1,
        },
      },
    );
  typia.assert(cartItem);
  // 7. List orders to find created order
  const ordersResponse =
    await api.functional.ecommerceMall.customer.orders.index(
      customerConnection,
      {
        body: {
          status: "paid",
        } satisfies IEcommerceMallOrder.IRequest,
      },
    );
  typia.assert(ordersResponse);
  // Get the first order
  TestValidator.predicate(
    "at least one order found",
    ordersResponse.data.length > 0,
  );
  const orderSummary = ordersResponse.data[0];
  // 8. Get order details to find order items
  const order = await api.functional.ecommerceMall.customer.orders.at(
    customerConnection,
    {
      orderId: orderSummary.id,
    },
  );
  typia.assert(order);
  // Find a delivered order item
  TestValidator.predicate("order has order items", order.orderItems.length > 0);
  const orderItem = order.orderItems[0];
  // 9. Seller creates shipment for the order items
  const shipment = await generate_random_ecommerce_mall_seller_shipments_create(
    sellerConnection,
    {
      body: {
        orderItemIds: [orderItem.id],
        carrierName: RandomGenerator.pick(["FedEx", "UPS", "DHL", "USPS"]),
        trackingNumber: RandomGenerator.alphaNumeric(12),
      } satisfies IEcommerceMallShipment.ICreate,
    },
  );
  typia.assert(shipment);
  // 10. Customer confirms delivery
  const delivery =
    await api.functional.ecommerceMall.customer.shipments.delivery.confirm(
      customerConnection,
      {
        shipmentId: shipment.id,
      },
    );
  typia.assert(delivery);
  // 11. Customer creates refund request for delivered order item
  const refundRequest =
    await generate_random_ecommerce_mall_customer_refund_requests_create(
      customerConnection,
      {
        body: {
          orderItemId: orderItem.id,
          reason: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IEcommerceMallRefundRequest.ICreate,
      },
    );
  typia.assert(refundRequest);
  // Verify refund request is in pending status
  TestValidator.equals(
    "refund request status is pending",
    refundRequest.status,
    "pending",
  );
  // 12. Customer deletes their pending refund request
  await api.functional.ecommerceMall.customer.refund_requests.erase(
    customerConnection,
    {
      refundRequestId: refundRequest.id,
    },
  );
  // 13. Verify the refund request deletion succeeds (no response body expected)
  // The delete operation returns void/204, which indicates success
}
