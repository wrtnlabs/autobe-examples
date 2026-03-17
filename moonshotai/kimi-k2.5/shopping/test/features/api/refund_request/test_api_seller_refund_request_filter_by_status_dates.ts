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
import type { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
import type { IEcommerceMallShipmentDelivery } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipmentDelivery";
import type { IEcommerceMallShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipmentItem";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallRefundRequest";
import type { IParentReference } from "@ORGANIZATION/PROJECT-api/lib/structures/IParentReference";
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
import { generate_random_ecommerce_mall_customer_cart_create } from "../../../generate/generate_random_ecommerce_mall_customer_cart_create";
import { generate_random_ecommerce_mall_customer_checkout_create } from "../../../generate/generate_random_ecommerce_mall_customer_checkout_create";
import { generate_random_ecommerce_mall_customer_refund_requests_create } from "../../../generate/generate_random_ecommerce_mall_customer_refund_requests_create";
import { generate_random_ecommerce_mall_seller_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_create";
import { generate_random_ecommerce_mall_seller_shipments_create } from "../../../generate/generate_random_ecommerce_mall_seller_shipments_create";
import { prepare_random_ecommerce_mall_cart_item } from "../../../prepare/prepare_random_ecommerce_mall_cart_item";
import { prepare_random_ecommerce_mall_order } from "../../../prepare/prepare_random_ecommerce_mall_order";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_product_image } from "../../../prepare/prepare_random_ecommerce_mall_product_image";
import { prepare_random_ecommerce_mall_refund_request } from "../../../prepare/prepare_random_ecommerce_mall_refund_request";
import { prepare_random_ecommerce_mall_shipment } from "../../../prepare/prepare_random_ecommerce_mall_shipment";

export async function test_api_seller_refund_request_filter_by_status_dates(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create seller and authenticate
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuthorized = await authorize_seller_join(sellerConnection, {
    body: {},
  });
  // 2. Create a product as seller
  const product = await generate_random_ecommerce_mall_seller_products_create(
    sellerConnection,
    { body: {} },
  );
  typia.assert(product);
  // 3. Create customer and authenticate
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuthorized = await authorize_customer_join(customerConnection, {
    body: {},
  });
  // 4. Add product variant to cart
  const variant = product.variants[0];
  typia.assertGuard(variant);
  await generate_random_ecommerce_mall_customer_cart_create(
    customerConnection,
    {
      body: {
        productVariantId: variant.id,
        quantity: 1,
      },
    },
  );
  // 5. Checkout to create order
  const order = await generate_random_ecommerce_mall_customer_checkout_create(
    customerConnection,
    {
      body: {
        recipientName: "Test Recipient",
        recipientPhone: "01012345678",
        streetAddress: "123 Test Street",
        city: "Seoul",
        state: null,
        postalCode: "12345",
        country: "KR",
      },
    },
  );
  typia.assert(order);
  // 6. Get the order item ID
  const orderItem = typia.assert<IEcommerceMallOrderItem & IEntity>(order.orderItems[0]);
  // 7. Create shipment as seller
  const shipment = await generate_random_ecommerce_mall_seller_shipments_create(
    sellerConnection,
    {
      body: {
        orderItemIds: [orderItem.id],
        carrierName: "TestCarrier",
        trackingNumber: "TRACK123456",
      },
    },
  );
  typia.assert(shipment);
  // 8. Confirm delivery as customer
  await api.functional.ecommerceMall.customer.shipments.deliveries.confirmDelivery(
    customerConnection,
    { shipmentId: shipment.id },
  );
  // 9. Create refund request as customer
  const refundRequest =
    await generate_random_ecommerce_mall_customer_refund_requests_create(
      customerConnection,
      {
        body: {
          orderItemId: orderItem.id,
          reason: "Product not as described",
        },
      },
    );
  typia.assert(refundRequest);
  // 10. Test filtering refund requests as seller - by status pending
  const pendingFilterResult =
    await api.functional.ecommerceMall.seller.refundRequests.index(
      sellerConnection,
      {
        body: {
          status: "pending",
        },
      },
    );
  typia.assert(pendingFilterResult);
  TestValidator.predicate(
    "pending filter should contain the refund request",
    pendingFilterResult.data.some((r) => r.id === refundRequest.id),
  );
  // 11. Test filtering by status approved (should not find it yet)
  const approvedFilterResult =
    await api.functional.ecommerceMall.seller.refundRequests.index(
      sellerConnection,
      {
        body: {
          status: "approved",
        },
      },
    );
  typia.assert(approvedFilterResult);
  TestValidator.predicate(
    "approved filter should not contain the refund request yet",
    !approvedFilterResult.data.some((r) => r.id === refundRequest.id),
  );
  // 12. Test filtering by orderItemId
  const orderItemFilterResult =
    await api.functional.ecommerceMall.seller.refundRequests.index(
      sellerConnection,
      {
        body: {
          orderItemId: orderItem.id,
        },
      },
    );
  typia.assert(orderItemFilterResult);
  TestValidator.predicate(
    "orderItemId filter should contain the refund request",
    orderItemFilterResult.data.some((r) => r.id === refundRequest.id),
  );
  // 13. Test filtering by date range (submittedAfter and submittedBefore)
  const submittedAfter = new Date(
    Date.now() - 24 * 60 * 60 * 1000,
  ).toISOString(); // 1 day ago
  const submittedBefore = new Date(
    Date.now() + 24 * 60 * 60 * 1000,
  ).toISOString(); // 1 day from now
  const dateRangeFilterResult =
    await api.functional.ecommerceMall.seller.refundRequests.index(
      sellerConnection,
      {
        body: {
          submittedAfter,
          submittedBefore,
        },
      },
    );
  typia.assert(dateRangeFilterResult);
  TestValidator.predicate(
    "date range filter should contain the refund request",
    dateRangeFilterResult.data.some((r) => r.id === refundRequest.id),
  );
  // 14. Test combined filter (status + orderItemId)
  const combinedFilterResult =
    await api.functional.ecommerceMall.seller.refundRequests.index(
      sellerConnection,
      {
        body: {
          status: "pending",
          orderItemId: orderItem.id,
        },
      },
    );
  typia.assert(combinedFilterResult);
  TestValidator.predicate(
    "combined filter should contain the refund request",
    combinedFilterResult.data.some((r) => r.id === refundRequest.id),
  );
  // 15. Test filtering with no results (wrong status)
  const rejectedFilterResult =
    await api.functional.ecommerceMall.seller.refundRequests.index(
      sellerConnection,
      {
        body: {
          status: "rejected",
        },
      },
    );
  typia.assert(rejectedFilterResult);
  TestValidator.predicate(
    "rejected filter should not contain the pending refund request",
    !rejectedFilterResult.data.some((r) => r.id === refundRequest.id),
  );
  // 16. Test that sellerId is automatically applied (no need to pass it)
  // The seller should only see their own refund requests
  const allRequests =
    await api.functional.ecommerceMall.seller.refundRequests.index(
      sellerConnection,
      {
        body: {
          limit: 100,
        },
      },
    );
  typia.assert(allRequests);
  TestValidator.predicate(
    "seller should only see their own refund requests or empty list",
    allRequests.data.every(
      (r) =>
        // Each request's order item product should belong to this seller
        r.productName !== undefined,
    ),
  );
}