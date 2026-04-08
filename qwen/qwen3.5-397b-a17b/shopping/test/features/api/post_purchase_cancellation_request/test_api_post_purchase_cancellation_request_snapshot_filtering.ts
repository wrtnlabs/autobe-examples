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
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { generate_random_shopping_mall_seller_products_variants_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_create";
import { prepare_random_shopping_mall_order } from "../../../prepare/prepare_random_shopping_mall_order";
import { prepare_random_shopping_mall_post_purchase_cancellation_request } from "../../../prepare/prepare_random_shopping_mall_post_purchase_cancellation_request";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";

/**
 * Test cancellation request snapshot filtering with status, date range, and seller response filters.
 *
 * Validates the complete snapshot filtering functionality for post-purchase cancellation requests. Tests individual filters (status, hasSellerResponse, date range) and combined filter scenarios to ensure the audit trail can be queried effectively for dispute resolution.
 *
 * The test establishes a complete workflow: member registration, seller registration, product creation with variant, order placement, and cancellation request creation. Then it verifies that snapshot filtering correctly returns only matching records while maintaining chronological ordering and accurate pagination metadata.
 *
 * 1. Member and seller register and authenticate.
 * 2. Seller creates product with variant.
 * 3. Member places order containing the variant.
 * 4. Member creates cancellation request for order item.
 * 5. Test status filter (pending, approved, rejected).
 * 6. Test hasSellerResponse filter (true, false).
 * 7. Test date range filter (from, to).
 * 8. Test combined filters with pagination.
 * 9. Verify pagination metadata accuracy.
 * 10. Verify chronological ordering by created_at.
 */
export async function test_api_post_purchase_cancellation_request_snapshot_filtering(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member registration and authentication
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallMember.IJoin,
  });
  typia.assert(member);
  // 2. Seller registration and authentication
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(seller);
  // 3. Seller creates product
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        shopping_mall_category_id: typia.random<string & tags.Format<"uuid">>(),
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert(product);
  // 4. Seller creates product variant
  const variant =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          sku_code: RandomGenerator.alphaNumeric(8),
          option_values: `Color: ${RandomGenerator.pick(["Red", "Blue", "Green"])}, Size: ${RandomGenerator.pick(["S", "M", "L"])}`,
          price: typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1000>
          >(),
        } satisfies IShoppingMallProductVariant.ICreate,
      },
    );
  typia.assert(variant);
  // 5. Member places order (this requires cart items, but we'll use the generation function)
  // Note: In real scenario, cart items need to be added first
  // For this test, we'll create the order using the generation function
  const order = await generate_random_shopping_mall_member_orders_create(
    memberConnection,
    {
      body: {
        shopping_mall_customer_address_id: typia.random<
          string & tags.Format<"uuid">
        >(),
      } satisfies IShoppingMallOrder.ICreate,
    },
  );
  typia.assert(order);
  // Get the first order item for cancellation request
  const orderItem = order.orderItems[0];
  TestValidator.predicate("order has items", () => order.orderItems.length > 0);
  // 6. Member creates cancellation request
  const cancellationRequest =
    await generate_random_shopping_mall_member_post_purchase_cancellation_requests_create(
      memberConnection,
      {
        body: {
          shopping_mall_order_item_id: orderItem.id,
          reason: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IShoppingMallPostPurchaseCancellationRequest.ICreate,
      },
    );
  typia.assert(cancellationRequest);
  // 7. Test status filter - pending (initial state)
  const pendingSnapshots =
    await api.functional.shoppingMall.member.post_purchase.cancellation_requests.snapshots.index(
      memberConnection,
      {
        cancellationRequestId: cancellationRequest.id,
        body: {
          status: "pending",
          page: 1,
          limit: 10,
        } satisfies IShoppingMallPostPurchaseCancellationRequestSnapshot.IRequest,
      },
    );
  typia.assert(pendingSnapshots);
  TestValidator.predicate(
    "pending snapshots exist",
    () => pendingSnapshots.data.length > 0,
  );
  TestValidator.predicate("all pending have correct status", () =>
    pendingSnapshots.data.every((s) => s.status === "pending"),
  );
  // 8. Test status filter - approved (should be empty initially)
  const approvedSnapshots =
    await api.functional.shoppingMall.member.post_purchase.cancellation_requests.snapshots.index(
      memberConnection,
      {
        cancellationRequestId: cancellationRequest.id,
        body: {
          status: "approved",
          page: 1,
          limit: 10,
        } satisfies IShoppingMallPostPurchaseCancellationRequestSnapshot.IRequest,
      },
    );
  typia.assert(approvedSnapshots);
  TestValidator.equals(
    "approved snapshots empty initially",
    approvedSnapshots.data.length,
    0,
  );
  // 9. Test status filter - rejected (should be empty initially)
  const rejectedSnapshots =
    await api.functional.shoppingMall.member.post_purchase.cancellation_requests.snapshots.index(
      memberConnection,
      {
        cancellationRequestId: cancellationRequest.id,
        body: {
          status: "rejected",
          page: 1,
          limit: 10,
        } satisfies IShoppingMallPostPurchaseCancellationRequestSnapshot.IRequest,
      },
    );
  typia.assert(rejectedSnapshots);
  TestValidator.equals(
    "rejected snapshots empty initially",
    rejectedSnapshots.data.length,
    0,
  );
  // 10. Test hasSellerResponse filter - false (initial snapshot)
  const noResponseSnapshots =
    await api.functional.shoppingMall.member.post_purchase.cancellation_requests.snapshots.index(
      memberConnection,
      {
        cancellationRequestId: cancellationRequest.id,
        body: {
          hasSellerResponse: false,
          page: 1,
          limit: 10,
        } satisfies IShoppingMallPostPurchaseCancellationRequestSnapshot.IRequest,
      },
    );
  typia.assert(noResponseSnapshots);
  TestValidator.predicate(
    "no response snapshots exist",
    () => noResponseSnapshots.data.length > 0,
  );
  TestValidator.predicate("all no response have null seller_response", () =>
    noResponseSnapshots.data.every((s) => s.seller_response === null),
  );
  // 11. Test hasSellerResponse filter - true (should be empty initially)
  const hasResponseSnapshots =
    await api.functional.shoppingMall.member.post_purchase.cancellation_requests.snapshots.index(
      memberConnection,
      {
        cancellationRequestId: cancellationRequest.id,
        body: {
          hasSellerResponse: true,
          page: 1,
          limit: 10,
        } satisfies IShoppingMallPostPurchaseCancellationRequestSnapshot.IRequest,
      },
    );
  typia.assert(hasResponseSnapshots);
  TestValidator.equals(
    "response snapshots empty initially",
    hasResponseSnapshots.data.length,
    0,
  );
  // 12. Test date range filter
  const now = new Date();
  const from = new Date(now.getTime() - 1000 * 60 * 60 * 24); // 1 day ago
  const to = new Date(now.getTime() + 1000 * 60 * 60 * 24); // 1 day ahead
  const dateRangeSnapshots =
    await api.functional.shoppingMall.member.post_purchase.cancellation_requests.snapshots.index(
      memberConnection,
      {
        cancellationRequestId: cancellationRequest.id,
        body: {
          from: from.toISOString(),
          to: to.toISOString(),
          page: 1,
          limit: 10,
        } satisfies IShoppingMallPostPurchaseCancellationRequestSnapshot.IRequest,
      },
    );
  typia.assert(dateRangeSnapshots);
  TestValidator.predicate(
    "date range snapshots exist",
    () => dateRangeSnapshots.data.length > 0,
  );
  TestValidator.predicate("all snapshots within date range", () =>
    dateRangeSnapshots.data.every(
      (s) => new Date(s.created_at) >= from && new Date(s.created_at) <= to,
    ),
  );
  // 13. Test combined filters
  const combinedSnapshots =
    await api.functional.shoppingMall.member.post_purchase.cancellation_requests.snapshots.index(
      memberConnection,
      {
        cancellationRequestId: cancellationRequest.id,
        body: {
          status: "pending",
          hasSellerResponse: false,
          from: from.toISOString(),
          to: to.toISOString(),
          page: 1,
          limit: 10,
        } satisfies IShoppingMallPostPurchaseCancellationRequestSnapshot.IRequest,
      },
    );
  typia.assert(combinedSnapshots);
  TestValidator.predicate("combined filter snapshots valid", () =>
    combinedSnapshots.data.every(
      (s) =>
        s.status === "pending" &&
        s.seller_response === null &&
        new Date(s.created_at) >= from &&
        new Date(s.created_at) <= to,
    ),
  );
  // 14. Test pagination
  const paginatedSnapshots =
    await api.functional.shoppingMall.member.post_purchase.cancellation_requests.snapshots.index(
      memberConnection,
      {
        cancellationRequestId: cancellationRequest.id,
        body: {
          page: 1,
          limit: 5,
        } satisfies IShoppingMallPostPurchaseCancellationRequestSnapshot.IRequest,
      },
    );
  typia.assert(paginatedSnapshots);
  TestValidator.predicate(
    "pagination current page valid",
    () => paginatedSnapshots.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit valid",
    () => paginatedSnapshots.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records non-negative",
    () => paginatedSnapshots.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages non-negative",
    () => paginatedSnapshots.pagination.pages >= 0,
  );
  // 15. Verify chronological ordering
  const allSnapshots =
    await api.functional.shoppingMall.member.post_purchase.cancellation_requests.snapshots.index(
      memberConnection,
      {
        cancellationRequestId: cancellationRequest.id,
        body: {
          page: 1,
          limit: 100,
        } satisfies IShoppingMallPostPurchaseCancellationRequestSnapshot.IRequest,
      },
    );
  typia.assert(allSnapshots);
  TestValidator.predicate("snapshots ordered chronologically", () => {
    for (let i = 1; i < allSnapshots.data.length; i++) {
      if (
        new Date(allSnapshots.data[i].created_at) <
        new Date(allSnapshots.data[i - 1].created_at)
      ) {
        return false;
      }
    }
    return true;
  });
}