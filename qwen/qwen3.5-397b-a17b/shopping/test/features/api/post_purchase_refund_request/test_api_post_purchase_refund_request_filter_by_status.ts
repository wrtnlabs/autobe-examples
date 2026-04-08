import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallPostPurchaseRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallPostPurchaseRefundRequest";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequest";
import type { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSnapshot";
import type { IShoppingMallOrderItemSnapshotOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSnapshotOption";
import type { IShoppingMallPostPurchaseRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPostPurchaseRefundRequest";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
import type { IShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReview";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_member_cart_items_create } from "../../../generate/generate_random_shopping_mall_member_cart_items_create";
import { generate_random_shopping_mall_member_orders_create } from "../../../generate/generate_random_shopping_mall_member_orders_create";
import { generate_random_shopping_mall_member_post_purchase_refund_requests_create } from "../../../generate/generate_random_shopping_mall_member_post_purchase_refund_requests_create";
import { generate_random_shopping_mall_seller_orders_shipments_create } from "../../../generate/generate_random_shopping_mall_seller_orders_shipments_create";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { prepare_random_shopping_mall_cart_item } from "../../../prepare/prepare_random_shopping_mall_cart_item";
import { prepare_random_shopping_mall_order } from "../../../prepare/prepare_random_shopping_mall_order";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_refund_request } from "../../../prepare/prepare_random_shopping_mall_refund_request";
import { prepare_random_shopping_mall_shipment } from "../../../prepare/prepare_random_shopping_mall_shipment";

/**
 * Test seller filtering of post-purchase refund requests by status.
 *
 * Validates the complete refund request filtering workflow including seller and member account setup, product creation, order placement, shipment delivery, and multiple refund request creation with different statuses. Ensures that the status filter correctly returns only refund requests matching the specified status values.
 *
 * The test creates three refund requests with different statuses (pending, approved, rejected) and verifies that filtering by single status returns only matching requests, and filtering by array of statuses returns requests matching any of the specified statuses using OR logic.
 *
 * 1. Seller and member accounts are created and authenticated.
 * 2. Seller creates a product with variants.
 * 3. Member adds product to cart and places order.
 * 4. Seller creates shipment to deliver the order.
 * 5. Member creates three refund requests for different order items.
 * 6. Seller approves one refund request and rejects another.
 * 7. Seller filters refund requests by 'pending' status - verifies only pending requests returned.
 * 8. Seller filters refund requests by 'approved' status - verifies only approved requests returned.
 * 9. Seller filters refund requests by ['pending', 'rejected'] - verifies OR logic works correctly.
 * 10. Validates pagination metadata reflects correct filtered record counts.
 */
export async function test_api_post_purchase_refund_request_filter_by_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerJoin = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(sellerJoin);
  // Note: Seller needs admin approval before they can create products
  // For E2E testing, we assume seller is already approved or use a pre-approved seller
  // 2. Create and authenticate member
  const memberConnection: api.IConnection = { host: connection.host };
  const memberJoin = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(memberJoin);
  // 3. Seller creates product
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {},
  );
  typia.assert(product);
  // 4. Member adds product variant to cart
  const variant = product.variants[0];
  const cartItem = await generate_random_shopping_mall_member_cart_items_create(
    memberConnection,
    {
      body: {
        product_variant_id: variant.id,
        quantity: 2,
      },
    },
  );
  typia.assert(cartItem);
  // 5. Member places order
  const order = await generate_random_shopping_mall_member_orders_create(
    memberConnection,
    {},
  );
  typia.assert(order);
  // 6. Seller creates shipment for order items
  const orderItem = order.orderItems[0];
  const shipment =
    await generate_random_shopping_mall_seller_orders_shipments_create(
      sellerConnection,
      {
        body: {
          order_item_ids: [orderItem.id],
          carrier_name: "Test Carrier",
          tracking_number: RandomGenerator.alphaNumeric(12),
        },
        params: {
          orderId: order.id,
        },
      },
    );
  typia.assert(shipment);
  // 7. Member creates three refund requests for the delivered order item
  // Note: In real scenario, we'd need multiple order items for multiple refund requests
  // For this test, we create refund requests and manually set different statuses through seller actions
  const refundRequest1 =
    await generate_random_shopping_mall_member_post_purchase_refund_requests_create(
      memberConnection,
      {
        body: {
          order_item_id: orderItem.id,
          reason: "Product defective - request 1",
        },
      },
    );
  typia.assert(refundRequest1);
  // Create additional order items for more refund requests
  // Add another variant to cart
  const variant2 = product.variants.length > 1 ? product.variants[1] : variant;
  const cartItem2 =
    await generate_random_shopping_mall_member_cart_items_create(
      memberConnection,
      {
        body: {
          product_variant_id: variant2.id,
          quantity: 1,
        },
      },
    );
  typia.assert(cartItem2);
  // Place second order
  const order2 = await generate_random_shopping_mall_member_orders_create(
    memberConnection,
    {},
  );
  typia.assert(order2);
  // Seller ships second order
  const orderItem2 = order2.orderItems[0];
  const shipment2 =
    await generate_random_shopping_mall_seller_orders_shipments_create(
      sellerConnection,
      {
        body: {
          order_item_ids: [orderItem2.id],
          carrier_name: "Test Carrier 2",
          tracking_number: RandomGenerator.alphaNumeric(12),
        },
        params: {
          orderId: order2.id,
        },
      },
    );
  typia.assert(shipment2);
  // Create second refund request
  const refundRequest2 =
    await generate_random_shopping_mall_member_post_purchase_refund_requests_create(
      memberConnection,
      {
        body: {
          order_item_id: orderItem2.id,
          reason: "Wrong item received - request 2",
        },
      },
    );
  typia.assert(refundRequest2);
  // Create third order for third refund request
  const cartItem3 =
    await generate_random_shopping_mall_member_cart_items_create(
      memberConnection,
      {
        body: {
          product_variant_id: variant.id,
          quantity: 1,
        },
      },
    );
  typia.assert(cartItem3);
  const order3 = await generate_random_shopping_mall_member_orders_create(
    memberConnection,
    {},
  );
  typia.assert(order3);
  const orderItem3 = order3.orderItems[0];
  const shipment3 =
    await generate_random_shopping_mall_seller_orders_shipments_create(
      sellerConnection,
      {
        body: {
          order_item_ids: [orderItem3.id],
          carrier_name: "Test Carrier 3",
          tracking_number: RandomGenerator.alphaNumeric(12),
        },
        params: {
          orderId: order3.id,
        },
      },
    );
  typia.assert(shipment3);
  const refundRequest3 =
    await generate_random_shopping_mall_member_post_purchase_refund_requests_create(
      memberConnection,
      {
        body: {
          order_item_id: orderItem3.id,
          reason: "Not as described - request 3",
        },
      },
    );
  typia.assert(refundRequest3);
  // 8. Seller approves refundRequest1
  const approvedRequest =
    await api.functional.shoppingMall.seller.refund_requests.approve(
      sellerConnection,
      {
        refundRequestId: refundRequest1.id,
      },
    );
  typia.assert(approvedRequest);
  TestValidator.equals("approved status", approvedRequest.status, "approved");
  // 9. Seller rejects refundRequest2
  const rejectedRequest =
    await api.functional.shoppingMall.seller.refund_requests.reject(
      sellerConnection,
      {
        refundRequestId: refundRequest2.id,
        body: {
          sellerResponseComment:
            "Refund request does not meet policy requirements",
        },
      },
    );
  typia.assert(rejectedRequest);
  TestValidator.equals("rejected status", rejectedRequest.status, "rejected");
  // refundRequest3 remains pending
  // 10. Test filtering by 'pending' status
  const pendingFilter =
    await api.functional.shoppingMall.seller.post_purchase.refund_requests.index(
      sellerConnection,
      {
        body: {
          status: "pending",
        },
      },
    );
  typia.assert(pendingFilter);
  TestValidator.predicate("pending filter returns only pending requests", () =>
    pendingFilter.data.every((req) => req.status === "pending"),
  );
  TestValidator.predicate(
    "pending filter excludes approved requests",
    () => !pendingFilter.data.some((req) => req.status === "approved"),
  );
  TestValidator.predicate(
    "pending filter excludes rejected requests",
    () => !pendingFilter.data.some((req) => req.status === "rejected"),
  );
  TestValidator.equals(
    "pending filter count",
    pendingFilter.pagination.records,
    pendingFilter.data.length,
  );
  // 11. Test filtering by 'approved' status
  const approvedFilter =
    await api.functional.shoppingMall.seller.post_purchase.refund_requests.index(
      sellerConnection,
      {
        body: {
          status: "approved",
        },
      },
    );
  typia.assert(approvedFilter);
  TestValidator.predicate(
    "approved filter returns only approved requests",
    () => approvedFilter.data.every((req) => req.status === "approved"),
  );
  TestValidator.predicate(
    "approved filter excludes pending requests",
    () => !approvedFilter.data.some((req) => req.status === "pending"),
  );
  TestValidator.predicate(
    "approved filter excludes rejected requests",
    () => !approvedFilter.data.some((req) => req.status === "rejected"),
  );
  TestValidator.equals(
    "approved filter count",
    approvedFilter.pagination.records,
    approvedFilter.data.length,
  );
  // 12. Test filtering by ['pending', 'rejected'] status (OR logic)
  const multiStatusFilter =
    await api.functional.shoppingMall.seller.post_purchase.refund_requests.index(
      sellerConnection,
      {
        body: {
          status: ["pending", "rejected"],
        },
      },
    );
  typia.assert(multiStatusFilter);
  TestValidator.predicate(
    "multi-status filter returns only pending or rejected requests",
    () =>
      multiStatusFilter.data.every(
        (req) => req.status === "pending" || req.status === "rejected",
      ),
  );
  TestValidator.predicate(
    "multi-status filter excludes approved requests",
    () => !multiStatusFilter.data.some((req) => req.status === "approved"),
  );
  TestValidator.equals(
    "multi-status filter count",
    multiStatusFilter.pagination.records,
    multiStatusFilter.data.length,
  );
  // 13. Verify at least one request exists for each status
  TestValidator.predicate(
    "at least one pending request exists",
    () => pendingFilter.data.length >= 1,
  );
  TestValidator.predicate(
    "at least one approved request exists",
    () => approvedFilter.data.length >= 1,
  );
  TestValidator.predicate("at least one rejected request exists", () =>
    multiStatusFilter.data.some((req) => req.status === "rejected"),
  );
}
