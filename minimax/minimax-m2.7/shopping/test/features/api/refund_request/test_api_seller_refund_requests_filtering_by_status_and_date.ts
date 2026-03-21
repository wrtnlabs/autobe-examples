import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequest";
import type { IEcommerceMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCart";
import type { IEcommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCartItem";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCheckoutConfirm } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCheckoutConfirm";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshot";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOptionValue";
import type { IEcommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequest";
import type { IEcommerceMallRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequestSnapshot";
import type { IEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReview";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import type { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
import type { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
import type { IEcommerceMallShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipmentItem";
import type { IEcommerceMallShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShippingAddress";
import type { IEcommerceMallWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallWishlistItem";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallRefundRequest";
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
import { generate_random_ecommerce_mall_seller_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_create";
import { generate_random_ecommerce_mall_seller_seller_products_variants_create } from "../../../generate/generate_random_ecommerce_mall_seller_seller_products_variants_create";
import { generate_random_ecommerce_mall_seller_shipments_create } from "../../../generate/generate_random_ecommerce_mall_seller_shipments_create";
import { prepare_random_ecommerce_mall_cart_item } from "../../../prepare/prepare_random_ecommerce_mall_cart_item";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_product_variant } from "../../../prepare/prepare_random_ecommerce_mall_product_variant";
import { prepare_random_ecommerce_mall_product_variant_option_value } from "../../../prepare/prepare_random_ecommerce_mall_product_variant_option_value";
import { prepare_random_ecommerce_mall_shipment } from "../../../prepare/prepare_random_ecommerce_mall_shipment";

export async function test_api_seller_refund_requests_filtering_by_status_and_date(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller registration and login
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {});
  sellerConnection.headers ??= {};
  sellerConnection.headers.Authorization = sellerAuth.token.access;
  const sellerLoginConnection: api.IConnection = { host: connection.host };
  const sellerLoginAuth = await authorize_seller_login(sellerLoginConnection, {
    body: {
      email: sellerAuth.email,
      password: (await import("typia")).random<string>(),
      href: "https://example.com/seller/login",
      referrer: "https://example.com/",
    } as any,
  });
  sellerLoginConnection.headers ??= {};
  sellerLoginConnection.headers.Authorization = sellerLoginAuth.token.access;
  // 2. Customer registration and login
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {});
  customerConnection.headers ??= {};
  customerConnection.headers.Authorization = customerAuth.token.access;
  const customerLoginConnection: api.IConnection = { host: connection.host };
  const customerLoginAuth = await authorize_customer_login(
    customerLoginConnection,
    {
      body: {
        email: customerAuth.email,
        password: (await import("typia")).random<string>(),
        href: "https://example.com/login",
        referrer: "https://example.com/",
      } as any,
    },
  );
  customerLoginConnection.headers ??= {};
  customerLoginConnection.headers.Authorization =
    customerLoginAuth.token.access;
  // 3. Seller creates product
  const product1 = await generate_random_ecommerce_mall_seller_products_create(
    sellerLoginConnection,
    {},
  );
  // 4. Create variant with inventory for product 1
  const variant1 =
    await generate_random_ecommerce_mall_seller_seller_products_variants_create(
      sellerLoginConnection,
      {
        params: { productId: product1.id },
        body: {
          sku_code: `SKU-${Date.now()}-1`,
          quantity: 100,
          option_values: [{ key: "color", value: "red" }],
        },
      },
    );
  typia.assert(variant1);
  // 5. Create product 2 for rejected refund scenario
  const product2 = await generate_random_ecommerce_mall_seller_products_create(
    sellerLoginConnection,
    {},
  );
  const variant2 =
    await generate_random_ecommerce_mall_seller_seller_products_variants_create(
      sellerLoginConnection,
      {
        params: { productId: product2.id },
        body: {
          sku_code: `SKU-${Date.now()}-2`,
          quantity: 50,
          option_values: [{ key: "size", value: "large" }],
        },
      },
    );
  typia.assert(variant2);
  // 6. Customer adds item 1 to cart and checks out
  const cartItem1 =
    await generate_random_ecommerce_mall_customer_cart_items_create(
      customerLoginConnection,
      {
        body: { variant_id: variant1.id, quantity: 1 },
      },
    );
  typia.assert(cartItem1);
  const order1 =
    await api.functional.ecommerceMall.customer.checkout.confirm.create(
      customerLoginConnection,
      {
        body: {
          payment_token: `payment-token-${Date.now()}`,
          address_id: customerAuth.shippingAddresses[0]?.id,
        },
      },
    );
  typia.assert(order1);
  // 7. Seller ships order 1
  const shipment1 =
    await generate_random_ecommerce_mall_seller_shipments_create(
      sellerLoginConnection,
      {
        body: {
          orderId: order1.id,
          orderItemIds: [order1.orderItems[0].id],
          carrier: "DHL",
          trackingNumber: "1234567890",
        },
      },
    );
  typia.assert(shipment1);
  // 8. Customer confirms delivery for order 1
  const confirmedShipment1 =
    await api.functional.ecommerceMall.customer.orders.shipments.confirm_delivery.confirmDelivery(
      customerLoginConnection,
      { orderId: order1.id, shipmentId: shipment1.id },
    );
  typia.assert(confirmedShipment1);
  // 9. Customer requests refund for order 1 (pending)
  const refundRequest1 =
    await api.functional.ecommerceMall.customer.refund_requests.index(
      customerLoginConnection,
      {
        body: {
          order_item_id: order1.orderItems[0].id,
          reason: "Product damaged",
        } as any,
      },
    );
  typia.assert(refundRequest1);
  // Wait a bit to ensure different timestamps
  await new Promise((resolve) => setTimeout(resolve, 1000));
  // 10. Customer adds item 2 to cart and checks out
  const cartItem2 =
    await generate_random_ecommerce_mall_customer_cart_items_create(
      customerLoginConnection,
      {
        body: { variant_id: variant2.id, quantity: 1 },
      },
    );
  typia.assert(cartItem2);
  const order2 =
    await api.functional.ecommerceMall.customer.checkout.confirm.create(
      customerLoginConnection,
      {
        body: {
          payment_token: `payment-token-${Date.now() + 1}`,
          address_id: customerAuth.shippingAddresses[0]?.id,
        },
      },
    );
  typia.assert(order2);
  // 11. Seller ships order 2
  const shipment2 =
    await generate_random_ecommerce_mall_seller_shipments_create(
      sellerLoginConnection,
      {
        body: {
          orderId: order2.id,
          orderItemIds: [order2.orderItems[0].id],
          carrier: "FedEx",
          trackingNumber: "9876543210",
        },
      },
    );
  typia.assert(shipment2);
  // 12. Customer confirms delivery for order 2
  const confirmedShipment2 =
    await api.functional.ecommerceMall.customer.orders.shipments.confirm_delivery.confirmDelivery(
      customerLoginConnection,
      { orderId: order2.id, shipmentId: shipment2.id },
    );
  typia.assert(confirmedShipment2);
  // 13. Customer requests refund for order 2 (pending - will be rejected)
  const refundRequest2 =
    await api.functional.ecommerceMall.customer.refund_requests.index(
      customerLoginConnection,
      {
        body: {
          order_item_id: order2.orderItems[0].id,
          reason: "Not as described",
        } as any,
      },
    );
  typia.assert(refundRequest2);
  // Wait for timestamp difference
  await new Promise((resolve) => setTimeout(resolve, 1000));
  // Get pending refunds to approve/reject
  const pendingRefunds =
    await api.functional.ecommerceMall.seller.refund_requests.index(
      sellerLoginConnection,
      {
        body: { status: "pending", limit: 100 },
      },
    );
  typia.assert(pendingRefunds);
  const pendingRefund1 = pendingRefunds.data.find(
    (r) => r.orderItem.id === order1.orderItems[0].id,
  );
  const pendingRefund2 = pendingRefunds.data.find(
    (r) => r.orderItem.id === order2.orderItems[0].id,
  );
  // 14. Seller approves refund 1 (creates approved status)
  if (pendingRefund1) {
    const approvedRefund1 =
      await api.functional.ecommerceMall.seller.refund_requests.approve(
        sellerLoginConnection,
        {
          requestId: pendingRefund1.id,
        },
      );
    typia.assert(approvedRefund1);
    TestValidator.equals(
      "approved refund status",
      approvedRefund1.status,
      "approved",
    );
  }
  // 15. Seller rejects refund 2 (creates rejected status)
  // Note: We need to use reject endpoint, but it's not in the available SDK functions
  // We'll simulate by filtering and checking pending refunds exist
  // Get current timestamp for date range filtering
  const now = new Date();
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  // 16. Test filtering by status='pending'
  const pendingResult =
    await api.functional.ecommerceMall.seller.refund_requests.index(
      sellerLoginConnection,
      {
        body: { status: "pending", limit: 100 },
      },
    );
  typia.assert(pendingResult);
  TestValidator.predicate("has pending results", pendingResult.data.length > 0);
  for (const refund of pendingResult.data) {
    TestValidator.equals("status is pending", refund.status, "pending");
  }
  // 17. Test filtering by status='approved'
  const approvedResult =
    await api.functional.ecommerceMall.seller.refund_requests.index(
      sellerLoginConnection,
      {
        body: { status: "approved", limit: 100 },
      },
    );
  typia.assert(approvedResult);
  TestValidator.predicate(
    "has approved results",
    approvedResult.data.length > 0,
  );
  for (const refund of approvedResult.data) {
    TestValidator.equals("status is approved", refund.status, "approved");
  }
  // 18. Test filtering by date range (created_at_from and created_at_to)
  const dateRangeResult =
    await api.functional.ecommerceMall.seller.refund_requests.index(
      sellerLoginConnection,
      {
        body: {
          created_at_from: oneHourAgo.toISOString(),
          created_at_to: tomorrow.toISOString(),
          limit: 100,
        },
      },
    );
  typia.assert(dateRangeResult);
  // All results should be within the date range
  for (const refund of dateRangeResult.data) {
    const createdAt = new Date(refund.created_at);
    TestValidator.predicate(
      "within date range",
      createdAt >= oneHourAgo && createdAt <= tomorrow,
    );
  }
  // 19. Test combining status and date filters
  const combinedResult =
    await api.functional.ecommerceMall.seller.refund_requests.index(
      sellerLoginConnection,
      {
        body: {
          status: "approved",
          created_at_from: oneHourAgo.toISOString(),
          created_at_to: tomorrow.toISOString(),
          limit: 100,
        },
      },
    );
  typia.assert(combinedResult);
  for (const refund of combinedResult.data) {
    TestValidator.equals("status is approved", refund.status, "approved");
    const createdAt = new Date(refund.created_at);
    TestValidator.predicate(
      "within date range",
      createdAt >= oneHourAgo && createdAt <= tomorrow,
    );
  }
  // 20. Test empty results with impossible date range (past date)
  const emptyDateResult =
    await api.functional.ecommerceMall.seller.refund_requests.index(
      sellerLoginConnection,
      {
        body: {
          created_at_from: "2020-01-01T00:00:00.000Z",
          created_at_to: "2020-01-02T00:00:00.000Z",
          limit: 100,
        },
      },
    );
  typia.assert(emptyDateResult);
  TestValidator.equals("empty data array", emptyDateResult.data.length, 0);
  TestValidator.equals(
    "pagination records",
    emptyDateResult.pagination.records,
    0,
  );
  TestValidator.equals("pagination pages", emptyDateResult.pagination.pages, 0);
  // 21. Test pagination metadata is correct
  TestValidator.equals("current page", pendingResult.pagination.current, 1);
  TestValidator.predicate(
    "has valid pagination",
    pendingResult.pagination.limit > 0,
  );
}
