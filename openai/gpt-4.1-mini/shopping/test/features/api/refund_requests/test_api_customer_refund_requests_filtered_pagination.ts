import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallRefundRequest";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorGrade";
import type { IShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequest";
import type { IShoppingMallCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequestSnapshot";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSnapshot";
import type { IShoppingMallOrderSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderSnapshot";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductCategory";
import type { IShoppingMallProductSubcategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSubcategory";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
import type { IShoppingMallRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequestSnapshot";
import type { IShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReview";
import type { IShoppingMallReviewSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReviewSnapshot";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_administrator_cancellation_request_snapshots_create } from "../../../generate/generate_random_shopping_mall_administrator_cancellation_request_snapshots_create";
import { generate_random_shopping_mall_administrator_order_item_snapshots_create_order_item_snapshot } from "../../../generate/generate_random_shopping_mall_administrator_order_item_snapshots_create_order_item_snapshot";
import { generate_random_shopping_mall_administrator_refund_request_snapshots_create } from "../../../generate/generate_random_shopping_mall_administrator_refund_request_snapshots_create";
import { generate_random_shopping_mall_administrator_review_snapshots_create_review_snapshot } from "../../../generate/generate_random_shopping_mall_administrator_review_snapshots_create_review_snapshot";
import { generate_random_shopping_mall_customer_cancellation_requests_create } from "../../../generate/generate_random_shopping_mall_customer_cancellation_requests_create";
import { generate_random_shopping_mall_customer_order_items_create } from "../../../generate/generate_random_shopping_mall_customer_order_items_create";
import { generate_random_shopping_mall_customer_orders_create } from "../../../generate/generate_random_shopping_mall_customer_orders_create";
import { generate_random_shopping_mall_customer_reviews_create } from "../../../generate/generate_random_shopping_mall_customer_reviews_create";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { generate_random_shopping_mall_seller_products_variants_create_variant } from "../../../generate/generate_random_shopping_mall_seller_products_variants_create_variant";
import { prepare_random_shopping_mall_cancellation_request } from "../../../prepare/prepare_random_shopping_mall_cancellation_request";
import { prepare_random_shopping_mall_cancellation_request_snapshot } from "../../../prepare/prepare_random_shopping_mall_cancellation_request_snapshot";
import { prepare_random_shopping_mall_order } from "../../../prepare/prepare_random_shopping_mall_order";
import { prepare_random_shopping_mall_order_item } from "../../../prepare/prepare_random_shopping_mall_order_item";
import { prepare_random_shopping_mall_order_item_snapshot } from "../../../prepare/prepare_random_shopping_mall_order_item_snapshot";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";
import { prepare_random_shopping_mall_refund_request_snapshot } from "../../../prepare/prepare_random_shopping_mall_refund_request_snapshot";
import { prepare_random_shopping_mall_review } from "../../../prepare/prepare_random_shopping_mall_review";
import { prepare_random_shopping_mall_review_snapshot } from "../../../prepare/prepare_random_shopping_mall_review_snapshot";

export async function test_api_customer_refund_requests_filtered_pagination(
  connection: api.IConnection,
): Promise<void> {
  /* Scenario 1: Retrieve refund requests with valid filters and pagination */
  // Setup customer authentication
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, { body: {} });
  typia.assert(customerAuth);
  customerConnection.headers = {
    Authorization: `Bearer ${customerAuth.token.access}`,
  };
  // Setup seller authentication
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, { body: {} });
  typia.assert(sellerAuth);
  sellerConnection.headers = {
    Authorization: `Bearer ${sellerAuth.token.access}`,
  };
  // Setup administrator authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_administrator_join(adminConnection, { body: {} });
  typia.assert(adminAuth);
  adminConnection.headers = {
    Authorization: `Bearer ${adminAuth.token.access}`,
  };
  // Create a product to link to
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    { body: {} },
  );
  typia.assert(product);
  // Create a product variant linked to the product
  const productVariant =
    await generate_random_shopping_mall_seller_products_variants_create_variant(
      sellerConnection,
      {
        body: {},
        params: { productId: product.id },
      },
    );
  typia.assert(productVariant);
  // Create a customer order with one order item
  const order = await generate_random_shopping_mall_customer_orders_create(
    customerConnection,
    {
      body: {
        orderItems: [
          {
            shoppingMallProductVariantId: productVariant.id,
            quantity: 1,
            status: "paid",
          },
        ],
      },
    },
  );
  typia.assert(order);
  // Create an order item linked to the order as used
  const orderItem =
    await generate_random_shopping_mall_customer_order_items_create(
      customerConnection,
      {
        body: {
          shoppingMallOrderId: order.id,
          shoppingMallProductVariantId: productVariant.id,
          quantity: 1,
          status: "paid",
        },
      },
    );
  typia.assert(orderItem);
  // Create a cancellation request related to the order item
  const cancellationRequest =
    await generate_random_shopping_mall_customer_cancellation_requests_create(
      customerConnection,
      {
        body: {
          shoppingMallCustomerId: customerAuth.id,
          shoppingMallOrderItemId: orderItem.id,
          reason: "Customer reason for cancellation",
        },
      },
    );
  typia.assert(cancellationRequest);
  // Create a review for the order item
  const review = await generate_random_shopping_mall_customer_reviews_create(
    customerConnection,
    {
      body: {
        rating: 5,
        body: "Great product!",
        // We do not know exact related fields for orderItem etc., so rely on snapshot creation
      },
    },
  );
  typia.assert(review);
  // Create snapshots required: order item, cancellation request, review, refund request
  const orderItemSnapshot =
    await generate_random_shopping_mall_administrator_order_item_snapshots_create_order_item_snapshot(
      adminConnection,
      {
        body: {
          shoppingMallOrderItemId: orderItem.id,
          shoppingMallOrderId: order.id,
          productName: product.name,
          variantSku: productVariant.skuCode,
          variantOptionValues: "[]",
          unitPrice: product.basePrice,
          quantity: orderItem.quantity,
          itemStatus: orderItem.status,
          sellerShopName: sellerAuth.shopName,
          sellerLogoUri: sellerAuth.logoUri ?? null,
        },
      },
    );
  typia.assert(orderItemSnapshot);
  const cancellationRequestSnapshot =
    await generate_random_shopping_mall_administrator_cancellation_request_snapshots_create(
      adminConnection,
      {
        body: {
          cancellation_request_id: cancellationRequest.id,
          reason: cancellationRequest.reason,
          status: cancellationRequest.sellerApprovalStatus,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      },
    );
  typia.assert(cancellationRequestSnapshot);
  const reviewSnapshot =
    await generate_random_shopping_mall_administrator_review_snapshots_create_review_snapshot(
      adminConnection,
      {
        body: {
          shoppingMallProductReviewId: review.id,
          rating: review.rating,
          body: review.body,
          snapshotCreatedAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      },
    );
  typia.assert(reviewSnapshot);
  const refundRequestSnapshot =
    await generate_random_shopping_mall_administrator_refund_request_snapshots_create(
      adminConnection,
      {
        body: {
          shoppingMallRefundRequestId: typia.random<
            string & tags.Format<"uuid">
          >(), // Simulate random refund request ID
          status: "pending",
          reason: "Refund reason",
          comment: "Refund comment",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          deletedAt: null,
        },
      },
    );
  typia.assert(refundRequestSnapshot);
  // Scenario 1: Call refund requests endpoint with filters
  const now = new Date();
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const filterBody1: IShoppingMallRefundRequest.IRequest = {
    status: "pending",
    shoppingMallSellerId: sellerAuth.id,
    shoppingMallCustomerId: customerAuth.id,
    requestedAtFrom: oneDayAgo.toISOString(),
    requestedAtTo: now.toISOString(),
    respondedAtFrom: oneDayAgo.toISOString(),
    respondedAtTo: now.toISOString(),
    page: 1,
    limit: 10,
  };
  const refundRequests1 =
    await api.functional.shoppingMall.customer.refund_requests.index(
      customerConnection,
      { body: filterBody1 },
    );
  typia.assert(refundRequests1);
  // Validate response have pagination and data
  TestValidator.predicate(
    "refund requests pagination data",
    Array.isArray(refundRequests1.data),
  );
  TestValidator.predicate(
    "refund requests pagination info",
    typeof refundRequests1.pagination === "object",
  );
  // Validate each refund request
  for (const refundRequest of refundRequests1.data) {
    typia.assert(refundRequest);
    TestValidator.equals(
      "refund request status",
      refundRequest.status,
      "pending",
    );
    TestValidator.equals(
      "refund request seller id",
      refundRequest.seller.id,
      sellerAuth.id,
    );
    TestValidator.equals(
      "refund request customer id",
      refundRequest.customer.id,
      customerAuth.id,
    );
  }
  /* Scenario 2: No filter - retrieve all refund requests accessible by customer */
  const filterBody2: IShoppingMallRefundRequest.IRequest = {
    page: 1,
    limit: 10,
  };
  const refundRequests2 =
    await api.functional.shoppingMall.customer.refund_requests.index(
      customerConnection,
      { body: filterBody2 },
    );
  typia.assert(refundRequests2);
  TestValidator.predicate(
    "refund requests with no filters data",
    Array.isArray(refundRequests2.data),
  );
  TestValidator.predicate(
    "refund requests with no filters pagination",
    typeof refundRequests2.pagination === "object",
  );
  /* Scenario 3: Authorization enforcement - Access denied without authentication */
  const unauthCustomerConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError(
    "unauthorized access should be rejected",
    401,
    async () => {
      await api.functional.shoppingMall.customer.refund_requests.index(
        unauthCustomerConnection,
        { body: filterBody2 },
      );
    },
  );
}

