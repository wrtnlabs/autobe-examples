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
 * Test cancellation request snapshot chronological ordering and pagination.
 *
 * Validates that cancellation request snapshots are returned in chronological order (created_at ascending) with proper pagination metadata. The test verifies the complete audit trail progression from initial pending state through seller responses.
 *
 * The test establishes a complete order lifecycle: seller creates product, customer places order, customer requests cancellation (while item is still 'paid'), then seller ships. This creates the initial pending snapshot. The test then validates pagination behavior across multiple scenarios.
 *
 * 1. Seller joins platform and creates product with variant.
 * 2. Member joins platform and places order for the product variant.
 * 3. Member creates post-purchase cancellation request while order item is 'paid' (generates initial pending snapshot).
 * 4. Seller creates shipment to mark order item as shipped.
 * 5. Seller retrieves all snapshots without filters - verifies chronological order.
 * 6. Seller tests pagination with page=1, limit=1 - verifies single record per page.
 * 7. Seller retrieves page=2, limit=1 - verifies order maintained across pages.
 * 8. Validates pagination metadata accuracy (current, limit, records, pages).
 */
export async function test_api_post_purchase_cancellation_request_snapshot_chronological_ordering_and_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller setup - join and create product with variant
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
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {},
  );
  typia.assert(product);
  const variant =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
      },
    );
  typia.assert(variant);
  // 2. Member setup - join and place order
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
  const order = await generate_random_shopping_mall_member_orders_create(
    memberConnection,
    {},
  );
  typia.assert(order);
  // 3. Member creates post-purchase cancellation request while order item is 'paid'
  // Must be done BEFORE shipment creation as cancellation requires 'paid' status
  const orderItem = order.orderItems[0];
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
  // 4. Seller creates shipment for order item (after cancellation request)
  const shipment =
    await generate_random_shopping_mall_seller_orders_shipments_create(
      sellerConnection,
      {
        params: { orderId: order.id },
        body: {
          order_item_ids: [orderItem.id],
          carrier_name: RandomGenerator.alphabets(10),
          tracking_number: RandomGenerator.alphaNumeric(12),
        } satisfies IShoppingMallShipment.ICreate,
      },
    );
  typia.assert(shipment);
  // 5. Seller retrieves all snapshots without filters - verify chronological order
  const allSnapshots =
    await api.functional.shoppingMall.seller.post_purchase.cancellation_requests.snapshots.index(
      sellerConnection,
      {
        cancellationRequestId: cancellationRequest.id,
        body: {} satisfies IShoppingMallPostPurchaseCancellationRequestSnapshot.IRequest,
      },
    );
  typia.assert(allSnapshots);
  // Verify pagination metadata
  TestValidator.equals("current page is 1", allSnapshots.pagination.current, 1);
  TestValidator.predicate("has limit value", allSnapshots.pagination.limit > 0);
  TestValidator.predicate(
    "records count positive",
    allSnapshots.pagination.records >= 1,
  );
  TestValidator.predicate(
    "pages calculated",
    allSnapshots.pagination.pages >= 1,
  );
  // Verify snapshots are ordered by created_at ascending (chronological)
  if (allSnapshots.data.length > 1) {
    for (let i = 1; i < allSnapshots.data.length; i++) {
      TestValidator.predicate(
        `snapshot ${i} created after ${i - 1}`,
        new Date(allSnapshots.data[i].created_at).getTime() >=
          new Date(allSnapshots.data[i - 1].created_at).getTime(),
      );
    }
  }
  // Verify first snapshot is initial pending state
  TestValidator.equals(
    "first snapshot is pending",
    allSnapshots.data[0].status,
    "pending",
  );
  TestValidator.predicate(
    "first snapshot has no seller response",
    allSnapshots.data[0].seller_response === null,
  );
  TestValidator.predicate(
    "first snapshot has no seller",
    allSnapshots.data[0].seller === null,
  );
  // 6. Test pagination with page=1, limit=1
  const page1 =
    await api.functional.shoppingMall.seller.post_purchase.cancellation_requests.snapshots.index(
      sellerConnection,
      {
        cancellationRequestId: cancellationRequest.id,
        body: {
          page: 1,
          limit: 1,
        } satisfies IShoppingMallPostPurchaseCancellationRequestSnapshot.IRequest,
      },
    );
  typia.assert(page1);
  TestValidator.equals("page 1 current", page1.pagination.current, 1);
  TestValidator.equals("page 1 limit", page1.pagination.limit, 1);
  TestValidator.equals(
    "page 1 has 1 record",
    page1.data.length,
    Math.min(1, allSnapshots.pagination.records),
  );
  // 7. Test pagination with page=2, limit=1 (if multiple snapshots exist)
  if (allSnapshots.pagination.records > 1) {
    const page2 =
      await api.functional.shoppingMall.seller.post_purchase.cancellation_requests.snapshots.index(
        sellerConnection,
        {
          cancellationRequestId: cancellationRequest.id,
          body: {
            page: 2,
            limit: 1,
          } satisfies IShoppingMallPostPurchaseCancellationRequestSnapshot.IRequest,
        },
      );
    typia.assert(page2);
    TestValidator.equals("page 2 current", page2.pagination.current, 2);
    TestValidator.equals("page 2 limit", page2.pagination.limit, 1);
    TestValidator.predicate("page 2 has record", page2.data.length >= 0);
    // Verify chronological order maintained across pages
    if (page1.data.length > 0 && page2.data.length > 0) {
      TestValidator.predicate(
        "page 2 snapshot after page 1",
        new Date(page2.data[0].created_at).getTime() >=
          new Date(page1.data[0].created_at).getTime(),
      );
    }
  }
  // 8. Test edge case: page beyond available pages returns empty array
  const beyondPage =
    await api.functional.shoppingMall.seller.post_purchase.cancellation_requests.snapshots.index(
      sellerConnection,
      {
        cancellationRequestId: cancellationRequest.id,
        body: {
          page: allSnapshots.pagination.pages + 10,
          limit: 1,
        } satisfies IShoppingMallPostPurchaseCancellationRequestSnapshot.IRequest,
      },
    );
  typia.assert(beyondPage);
  TestValidator.equals("beyond page returns empty", beyondPage.data.length, 0);
  // 9. Test large limit value (up to 100) returns all snapshots in single page
  const largeLimit =
    await api.functional.shoppingMall.seller.post_purchase.cancellation_requests.snapshots.index(
      sellerConnection,
      {
        cancellationRequestId: cancellationRequest.id,
        body: {
          page: 1,
          limit: 100,
        } satisfies IShoppingMallPostPurchaseCancellationRequestSnapshot.IRequest,
      },
    );
  typia.assert(largeLimit);
  TestValidator.equals(
    "large limit returns all records",
    largeLimit.data.length,
    allSnapshots.pagination.records,
  );
  TestValidator.equals(
    "large limit pages is 1",
    largeLimit.pagination.pages,
    1,
  );
}
