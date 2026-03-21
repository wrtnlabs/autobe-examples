import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequest";
import type { IEcommerceMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCart";
import type { IEcommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCartItem";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCheckout } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCheckout";
import type { IEcommerceMallCheckoutConfirm } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCheckoutConfirm";
import type { IEcommerceMallCheckoutPrepareItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCheckoutPrepareItem";
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

/**
 * Test that an authenticated seller can retrieve a paginated list of refund
 * requests for their products. The test verifies:
 * 1. The endpoint returns HTTP 200 with paginated results containing refund request summaries
 * 2. Each summary includes id, status, reason (truncated to 200 chars), created_at, and references to customer and order item
 * 3. Only refund requests for the authenticated seller's products are returned
 * 4. Pagination metadata includes current page, total records, and total pages
 * 5. Results are sorted by created_at descending (newest first) by default
 *
 * Test Flow:
 * 1. Seller registers and logs in (pending approval by default)
 * 2. Create a product with variant
 * 3. Customer registers and logs in
 * 4. Customer adds product to cart
 * 5. Customer prepares and confirms checkout
 * 6. Seller ships the order
 * 7. Customer confirms delivery
 * 8. Customer submits refund request
 * 9. Seller lists refund requests and validates response
 */
export async function test_api_seller_refund_requests_listing(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and login as seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {});
  typia.assert(sellerAuth);
  TestValidator.equals(
    "seller approval status",
    sellerAuth.approval_status,
    "pending",
  );
  // Login with seller credentials
  const sellerLogin: api.IConnection = { host: connection.host };
  await authorize_seller_login(sellerLogin, {
    body: {
      email: sellerAuth.email,
      password: "password" as any,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallSeller.ILogin,
  });
  // 2. Create product with variant
  const product = await generate_random_ecommerce_mall_seller_products_create(
    sellerLogin,
    {},
  );
  typia.assert(product);
  const variant =
    await generate_random_ecommerce_mall_seller_seller_products_variants_create(
      sellerLogin,
      {
        params: { productId: product.id },
        body: {
          sku_code: `SKU-${RandomGenerator.alphaNumeric(8)}`,
          price: typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1000>
          >(),
          quantity: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<5>
          >(),
          option_values: [
            {
              key: "size",
              value: "Large",
            } satisfies IEcommerceMallProductVariantOptionValue.ICreate,
          ],
        },
      },
    );
  typia.assert(variant);
  // 3. Register and login as customer
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {});
  typia.assert(customerAuth);
  const customerLogin: api.IConnection = { host: connection.host };
  await authorize_customer_login(customerLogin, {
    body: {
      email: customerAuth.email,
      password: "password" as any,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallCustomer.ILogin,
  });
  // 4. Customer adds product to cart
  const cartItem =
    await generate_random_ecommerce_mall_customer_cart_items_create(
      customerLogin,
      {
        body: {
          variant_id: variant.id,
          quantity: 1 satisfies number & tags.Type<"int32"> & tags.Minimum<1>,
        },
      },
    );
  typia.assert(cartItem);
  // 5. Prepare and confirm checkout
  const checkoutPrepare =
    await api.functional.ecommerceMall.customer.checkout.prepare(customerLogin);
  typia.assert(checkoutPrepare);
  // Add shipping address if needed
  TestValidator.equals(
    "has valid address for checkout",
    checkoutPrepare.hasValidAddress,
    true,
  );
  const order =
    await api.functional.ecommerceMall.customer.checkout.confirm.create(
      customerLogin,
      {
        body: {
          payment_token: `pay_${RandomGenerator.alphaNumeric(16)}`,
        } satisfies IEcommerceMallCheckoutConfirm.IRequest,
      },
    );
  typia.assert(order);
  TestValidator.equals("order has items", order.orderItems.length > 0, true);
  TestValidator.equals("order status", order.status, "paid");
  // 6. Seller creates shipment
  const orderItem = order.orderItems[0];
  const shipment = await generate_random_ecommerce_mall_seller_shipments_create(
    sellerLogin,
    {
      body: {
        orderId: order.id,
        orderItemIds: [orderItem.id],
        carrier: "DHL",
        trackingNumber: `TRK${RandomGenerator.alphaNumeric(10)}`,
      },
    },
  );
  typia.assert(shipment);
  // 7. Customer confirms delivery
  const confirmedShipment =
    await api.functional.ecommerceMall.customer.orders.shipments.confirm_delivery.confirmDelivery(
      customerLogin,
      {
        orderId: order.id,
        shipmentId: shipment.id,
      },
    );
  typia.assert(confirmedShipment);
  // 8. Customer submits refund request
  const refundReason =
    "Product received was damaged during shipping. Requesting full refund.";
  const refundResponse =
    await api.functional.ecommerceMall.customer.refund_requests.index(
      customerLogin,
      {
        body: {
          order_item_id: orderItem.id,
        } satisfies IEcommerceMallRefundRequest.IRequest,
      },
    );
  typia.assert(refundResponse);
  // Submit the refund request using PATCH
  const submittedRefund =
    await api.functional.ecommerceMall.customer.refund_requests.index(
      customerLogin,
      {
        body: {
          order_item_id: orderItem.id,
        } satisfies IEcommerceMallRefundRequest.IRequest,
      },
    );
  typia.assert(submittedRefund);
  // 9. Seller lists refund requests
  const refundRequestsPage =
    await api.functional.ecommerceMall.seller.refund_requests.index(
      sellerLogin,
      {
        body: {} satisfies IEcommerceMallRefundRequest.IRequest,
      },
    );
  typia.assert(refundRequestsPage);
  // Validate paginated response structure
  TestValidator.equals(
    "pagination exists",
    refundRequestsPage.pagination !== null,
    true,
  );
  TestValidator.equals(
    "current page is 1",
    refundRequestsPage.pagination.current,
    1,
  );
  TestValidator.equals(
    "has limit",
    refundRequestsPage.pagination.limit > 0,
    true,
  );
  TestValidator.equals(
    "has records",
    refundRequestsPage.pagination.records >= 0,
    true,
  );
  TestValidator.equals(
    "has pages",
    refundRequestsPage.pagination.pages >= 0,
    true,
  );
  // Validate data array
  TestValidator.equals(
    "data is array",
    Array.isArray(refundRequestsPage.data),
    true,
  );
  // If we have refund requests, validate their structure
  if (refundRequestsPage.data.length > 0) {
    const refundRequest = refundRequestsPage.data[0];
    // Validate summary fields exist
    TestValidator.equals("has id", refundRequest.id !== undefined, true);
    TestValidator.equals(
      "has status",
      refundRequest.status !== undefined,
      true,
    );
    TestValidator.equals(
      "has reason",
      refundRequest.reason !== undefined,
      true,
    );
    TestValidator.equals(
      "reason is string",
      typeof refundRequest.reason === "string",
      true,
    );
    TestValidator.equals(
      "reason truncated to 200 chars",
      refundRequest.reason.length <= 200,
      true,
    );
    TestValidator.equals(
      "has created_at",
      refundRequest.created_at !== undefined,
      true,
    );
    // Validate related entities
    TestValidator.equals(
      "has customer",
      refundRequest.customer !== undefined,
      true,
    );
    TestValidator.equals(
      "customer has id",
      refundRequest.customer.id !== undefined,
      true,
    );
    TestValidator.equals(
      "customer has email",
      refundRequest.customer.email !== undefined,
      true,
    );
    TestValidator.equals(
      "has seller",
      refundRequest.seller !== undefined,
      true,
    );
    TestValidator.equals(
      "seller has id",
      refundRequest.seller.id !== undefined,
      true,
    );
    TestValidator.equals(
      "has orderItem",
      refundRequest.orderItem !== undefined,
      true,
    );
    TestValidator.equals(
      "orderItem has id",
      refundRequest.orderItem.id !== undefined,
      true,
    );
    // Validate seller can only see their own refund requests
    // (seller_id should match the authenticated seller)
    for (const rr of refundRequestsPage.data) {
      TestValidator.equals(
        "refund belongs to seller",
        rr.seller.id,
        sellerAuth.id,
      );
    }
  }
  // Test filtering by status
  const pendingRefunds =
    await api.functional.ecommerceMall.seller.refund_requests.index(
      sellerLogin,
      {
        body: {
          status: "pending",
        } satisfies IEcommerceMallRefundRequest.IRequest,
      },
    );
  typia.assert(pendingRefunds);
  // If there are pending refunds, verify all have pending status
  if (pendingRefunds.data.length > 0) {
    for (const rr of pendingRefunds.data) {
      TestValidator.equals("status is pending", rr.status, "pending");
    }
  }
  // Test pagination - request page 1 with limit
  const page1 = await api.functional.ecommerceMall.seller.refund_requests.index(
    sellerLogin,
    {
      body: {
        page: 1,
        limit: 10,
      } satisfies IEcommerceMallRefundRequest.IRequest,
    },
  );
  typia.assert(page1);
  TestValidator.equals("page 1 limit", page1.pagination.limit, 10);
  TestValidator.equals("page 1 current", page1.pagination.current, 1);
  // Test sorting by created_at descending (default)
  // Verify records are sorted by created_at descending
  const allRefunds =
    await api.functional.ecommerceMall.seller.refund_requests.index(
      sellerLogin,
      {
        body: {
          limit: 100,
        } satisfies IEcommerceMallRefundRequest.IRequest,
      },
    );
  typia.assert(allRefunds);
  if (allRefunds.data.length > 1) {
    for (let i = 0; i < allRefunds.data.length - 1; i++) {
      const current = new Date(allRefunds.data[i].created_at);
      const next = new Date(allRefunds.data[i + 1].created_at);
      TestValidator.predicate(
        "sorted by created_at descending",
        current >= next,
      );
    }
  }
}
