import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallPostPurchaseCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallPostPurchaseCancellationRequestSnapshot";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequest";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSnapshot";
import type { IShoppingMallOrderItemSnapshotOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSnapshotOption";
import type { IShoppingMallPostPurchaseCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPostPurchaseCancellationRequest";
import type { IShoppingMallPostPurchaseCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPostPurchaseCancellationRequestSnapshot";
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
import { generate_random_shopping_mall_member_orders_create } from "../../../generate/generate_random_shopping_mall_member_orders_create";
import { generate_random_shopping_mall_member_post_purchase_cancellation_requests_create } from "../../../generate/generate_random_shopping_mall_member_post_purchase_cancellation_requests_create";
import { generate_random_shopping_mall_seller_orders_shipments_create } from "../../../generate/generate_random_shopping_mall_seller_orders_shipments_create";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { generate_random_shopping_mall_seller_products_variants_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_create";
import { prepare_random_shopping_mall_order } from "../../../prepare/prepare_random_shopping_mall_order";
import { prepare_random_shopping_mall_post_purchase_cancellation_request } from "../../../prepare/prepare_random_shopping_mall_post_purchase_cancellation_request";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";
import { prepare_random_shopping_mall_shipment } from "../../../prepare/prepare_random_shopping_mall_shipment";

/**
 * Test seller filtering of post-purchase cancellation request snapshots by status and seller response.
 *
 * Validates the complete snapshot filtering functionality for post-purchase cancellation requests. Tests that sellers can filter the audit trail by status (pending, approved, rejected), by presence of seller response (hasSellerResponse), and by date range. Ensures that the initial snapshot created when a customer submits a cancellation request is correctly distinguished from response snapshots created when a seller takes action.
 *
 * The test establishes a complete order lifecycle: seller creates product, customer places order, seller ships items, customer requests post-purchase cancellation. This creates the initial pending snapshot which is then used to validate filtering behavior.
 *
 * 1. Seller joins platform and creates product with variant.
 * 2. Member joins platform and places order for seller's product.
 * 3. Seller creates shipment to mark order item as shipped/delivered.
 * 4. Member creates post-purchase cancellation request (creates initial pending snapshot).
 * 5. Seller retrieves snapshots filtered by status='pending' and hasSellerResponse=false.
 * 6. Verifies initial snapshot has seller_response=null and status='pending'.
 * 7. Seller retrieves snapshots filtered by hasSellerResponse=true (should be empty initially).
 * 8. Seller retrieves snapshots with date range filter.
 * 9. Verifies pagination metadata reflects filtered result counts correctly.
 */
export async function test_api_post_purchase_cancellation_request_snapshot_filtering_by_status_and_seller_response(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller setup - join and authenticate
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(sellerAuth);
  // 2. Seller creates product
  const product =
    await generate_random_shopping_mall_seller_products_create(
      sellerConnection,
      {
        body: {
          name: typia.random<string>(),
          description: typia.random<string>(),
          base_price: randint(1000, 100000),
        },
      },
    );
  typia.assert(product);
  // 3. Seller creates product variant
  const variant =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
      },
    );
  typia.assert(variant);
  // 4. Member setup - join and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallMember.IJoin,
  });
  typia.assert(memberAuth);
  // 5. Member places order (requires cart items - simplified for test)
  const order =
    await generate_random_shopping_mall_member_orders_create(memberConnection, {
      body: {
        shopping_mall_customer_address_id: typia.random<string & tags.Format<"uuid">>(),
      },
    });
  typia.assert(order);
  // 6. Get order items for the order
  const orderItem = order.orderItems[0];
  TestValidator.predicate("order has items", order.orderItems.length > 0);
  // 7. Seller creates shipment for order item
  const shipment =
    await generate_random_shopping_mall_seller_orders_shipments_create(
      sellerConnection,
      {
        params: { orderId: order.id },
        body: {
          order_item_ids: [orderItem.id],
          carrier_name: RandomGenerator.name(),
          tracking_number: RandomGenerator.alphaNumeric(12),
        },
      },
    );
  typia.assert(shipment);
  // 8. Member creates post-purchase cancellation request
  const cancellationRequest =
    await generate_random_shopping_mall_member_post_purchase_cancellation_requests_create(
      memberConnection,
      {
        body: {
          shopping_mall_order_item_id: orderItem.id,
          reason: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(cancellationRequest);
  // 9. Seller retrieves snapshots filtered by status='pending' and hasSellerResponse=false
  const pendingSnapshots =
    await api.functional.shoppingMall.seller.post_purchase.cancellation_requests.snapshots.index(
      sellerConnection,
      {
        cancellationRequestId: cancellationRequest.id,
        body: {
          status: "pending",
          hasSellerResponse: false,
          page: 1,
          limit: 10,
        } satisfies IShoppingMallPostPurchaseCancellationRequestSnapshot.IRequest,
      },
    );
  typia.assert(pendingSnapshots);
  // 10. Verify initial snapshot is returned
  TestValidator.predicate(
    "pending snapshots returned",
    pendingSnapshots.data.length >= 1,
  );
  const initialSnapshot = pendingSnapshots.data[0];
  TestValidator.equals(
    "initial snapshot status is pending",
    initialSnapshot.status,
    "pending",
  );
  TestValidator.equals(
    "initial snapshot has no seller response",
    initialSnapshot.seller_response,
    null,
  );
  TestValidator.equals(
    "initial snapshot has no seller",
    initialSnapshot.seller,
    null,
  );
  // 11. Seller retrieves snapshots filtered by hasSellerResponse=true (should be empty initially)
  const responseSnapshots =
    await api.functional.shoppingMall.seller.post_purchase.cancellation_requests.snapshots.index(
      sellerConnection,
      {
        cancellationRequestId: cancellationRequest.id,
        body: {
          hasSellerResponse: true,
          page: 1,
          limit: 10,
        } satisfies IShoppingMallPostPurchaseCancellationRequestSnapshot.IRequest,
      },
    );
  typia.assert(responseSnapshots);
  // 12. Verify no response snapshots exist yet (seller hasn't responded)
  TestValidator.equals(
    "no response snapshots before seller action",
    responseSnapshots.data.length,
    0,
  );
  TestValidator.equals(
    "pagination records is 0",
    responseSnapshots.pagination.records,
    0,
  );
  TestValidator.equals(
    "pagination pages is 0",
    responseSnapshots.pagination.pages,
    0,
  );
  // 13. Seller retrieves snapshots with date range filter
  const now = new Date();
  const from = new Date(now.getTime() - 60000).toISOString(); // 1 minute ago
  const to = new Date(now.getTime() + 60000).toISOString(); // 1 minute from now
  const dateRangeSnapshots =
    await api.functional.shoppingMall.seller.post_purchase.cancellation_requests.snapshots.index(
      sellerConnection,
      {
        cancellationRequestId: cancellationRequest.id,
        body: {
          from: from,
          to: to,
          page: 1,
          limit: 10,
        } satisfies IShoppingMallPostPurchaseCancellationRequestSnapshot.IRequest,
      },
    );
  typia.assert(dateRangeSnapshots);
  // 14. Verify snapshots within date range
  TestValidator.predicate(
    "date range returns snapshots",
    dateRangeSnapshots.data.length >= 1,
  );
  for (const snapshot of dateRangeSnapshots.data) {
    TestValidator.predicate(
      "snapshot within date range",
      snapshot.created_at >= from && snapshot.created_at <= to,
    );
  }
  // 15. Test date range that excludes all snapshots
  const oldFrom = new Date(now.getTime() - 86400000).toISOString(); // 1 day ago
  const oldTo = new Date(now.getTime() - 86300000).toISOString(); // 59 minutes ago
  const emptyDateRangeSnapshots =
    await api.functional.shoppingMall.seller.post_purchase.cancellation_requests.snapshots.index(
      sellerConnection,
      {
        cancellationRequestId: cancellationRequest.id,
        body: {
          from: oldFrom,
          to: oldTo,
          page: 1,
          limit: 10,
        } satisfies IShoppingMallPostPurchaseCancellationRequestSnapshot.IRequest,
      },
    );
  typia.assert(emptyDateRangeSnapshots);
  // 16. Verify empty results for excluding date range
  TestValidator.equals(
    "empty results for old date range",
    emptyDateRangeSnapshots.data.length,
    0,
  );
  TestValidator.equals(
    "pagination records is 0 for empty range",
    emptyDateRangeSnapshots.pagination.records,
    0,
  );
  // 17. Test pagination with filtered results
  const paginatedSnapshots =
    await api.functional.shoppingMall.seller.post_purchase.cancellation_requests.snapshots.index(
      sellerConnection,
      {
        cancellationRequestId: cancellationRequest.id,
        body: {
          status: "pending",
          page: 1,
          limit: 1,
        } satisfies IShoppingMallPostPurchaseCancellationRequestSnapshot.IRequest,
      },
    );
  typia.assert(paginatedSnapshots);
  // 18. Verify pagination metadata
  TestValidator.predicate(
    "pagination current page is valid",
    paginatedSnapshots.pagination.current >= 1,
  );
  TestValidator.equals(
    "pagination limit matches request",
    paginatedSnapshots.pagination.limit,
    1,
  );
  TestValidator.predicate(
    "pagination records count is accurate",
    paginatedSnapshots.pagination.records >= 1,
  );
  TestValidator.predicate(
    "pagination pages calculated correctly",
    paginatedSnapshots.pagination.pages >= 1,
  );
  // 19. Test combined filters (status + hasSellerResponse)
  const combinedFilters =
    await api.functional.shoppingMall.seller.post_purchase.cancellation_requests.snapshots.index(
      sellerConnection,
      {
        cancellationRequestId: cancellationRequest.id,
        body: {
          status: "pending",
          hasSellerResponse: false,
          from: from,
          to: to,
          page: 1,
          limit: 10,
        } satisfies IShoppingMallPostPurchaseCancellationRequestSnapshot.IRequest,
      },
    );
  typia.assert(combinedFilters);
  // 20. Verify combined filters return expected results
  TestValidator.predicate(
    "combined filters return snapshots",
    combinedFilters.data.length >= 1,
  );
  for (const snapshot of combinedFilters.data) {
    TestValidator.equals(
      "snapshot status matches filter",
      snapshot.status,
      "pending",
    );
    TestValidator.equals(
      "snapshot has no seller response",
      snapshot.seller_response,
      null,
    );
  }
}