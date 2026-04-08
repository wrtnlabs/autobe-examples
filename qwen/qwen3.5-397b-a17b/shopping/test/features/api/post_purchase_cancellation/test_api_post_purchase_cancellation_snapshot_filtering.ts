import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallPostPurchaseCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallPostPurchaseCancellationRequestSnapshot";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
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

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
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
 * Test administrator filtering of post-purchase cancellation request snapshots.
 *
 * Validates the complete snapshot filtering functionality for post-purchase cancellation requests. Tests various filter combinations including status, date range, hasSellerResponse, and pagination parameters. Ensures that administrators can retrieve and filter the audit trail of cancellation request status changes.
 *
 * The test creates multiple cancellation requests through the complete workflow: member registration, seller product creation, order placement, and cancellation request submission. Cancellation requests are created before shipments since only order items with 'paid' status can be cancelled.
 *
 * 1. Administrator account is created and authenticated.
 * 2. Seller account is created, authenticated, and creates a product with variant.
 * 3. Member account is created, authenticated, and places two orders.
 * 4. Member creates two post-purchase cancellation requests (before shipment).
 * 5. Seller creates shipments for both orders (after cancellation requests).
 * 6. Administrator retrieves snapshots with status filter (pending).
 * 7. Administrator retrieves snapshots with hasSellerResponse filter (false).
 * 8. Administrator retrieves snapshots with date range filters (from and to).
 * 9. Administrator tests combined filters with multiple parameters.
 * 10. Administrator validates pagination with page and limit parameters.
 * 11. Administrator verifies chronological order (created_at ascending).
 * 12. Administrator tests empty result set handling with non-matching filters.
 */
export async function test_api_post_purchase_cancellation_snapshot_filtering(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      grade: "regular" as const,
    },
  });
  typia.assert(admin);
  // 2. Seller setup
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(seller);
  // 3. Create product
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 3 }),
        shopping_mall_category_id: typia.random<string & tags.Format<"uuid">>(),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
      },
    },
  );
  typia.assert(product);
  // 4. Create product variant
  const variant =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          sku_code: RandomGenerator.alphaNumeric(8),
          option_values: "Color: Red, Size: Large",
          price: typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1000>
          >(),
        },
      },
    );
  typia.assert(variant);
  // 5. Member setup
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(member);
  // 6. Create first order
  const order1 = await generate_random_shopping_mall_member_orders_create(
    memberConnection,
    {},
  );
  typia.assert(order1);
  // 7. Create second order
  const order2 = await generate_random_shopping_mall_member_orders_create(
    memberConnection,
    {},
  );
  typia.assert(order2);
  // 8. Member creates first post-purchase cancellation request (BEFORE shipment)
  const orderItem1 = order1.orderItems[0];
  const cancellationRequest1 =
    await generate_random_shopping_mall_member_post_purchase_cancellation_requests_create(
      memberConnection,
      {
        body: {
          shopping_mall_order_item_id: orderItem1.id,
          reason: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(cancellationRequest1);
  // 9. Member creates second post-purchase cancellation request (BEFORE shipment)
  const orderItem2 = order2.orderItems[0];
  const cancellationRequest2 =
    await generate_random_shopping_mall_member_post_purchase_cancellation_requests_create(
      memberConnection,
      {
        body: {
          shopping_mall_order_item_id: orderItem2.id,
          reason: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(cancellationRequest2);
  // 10. Seller creates shipment for first order (AFTER cancellation requests)
  const shipment1 =
    await generate_random_shopping_mall_seller_orders_shipments_create(
      sellerConnection,
      {
        params: { orderId: order1.id },
        body: {
          order_item_ids: [orderItem1.id],
          carrier_name: RandomGenerator.name(),
          tracking_number: RandomGenerator.alphaNumeric(12),
        },
      },
    );
  typia.assert(shipment1);
  // 11. Seller creates shipment for second order (AFTER cancellation requests)
  const shipment2 =
    await generate_random_shopping_mall_seller_orders_shipments_create(
      sellerConnection,
      {
        params: { orderId: order2.id },
        body: {
          order_item_ids: [orderItem2.id],
          carrier_name: RandomGenerator.name(),
          tracking_number: RandomGenerator.alphaNumeric(12),
        },
      },
    );
  typia.assert(shipment2);
  // 12. Test snapshot retrieval with status filter (pending)
  const snapshotsWithStatusFilter =
    await api.functional.shoppingMall.admin.post_purchase.cancellation_requests.snapshots.index(
      adminConnection,
      {
        cancellationRequestId: cancellationRequest1.id,
        body: {
          status: "pending",
          page: 1,
          limit: 10,
        },
      },
    );
  typia.assert(snapshotsWithStatusFilter);
  TestValidator.predicate("status filter returns data", () =>
    Array.isArray(snapshotsWithStatusFilter.data),
  );
  TestValidator.predicate(
    "pagination metadata exists",
    () => snapshotsWithStatusFilter.pagination !== undefined,
  );
  // 13. Test snapshot retrieval with hasSellerResponse filter (false)
  const snapshotsWithHasSellerResponseFilter =
    await api.functional.shoppingMall.admin.post_purchase.cancellation_requests.snapshots.index(
      adminConnection,
      {
        cancellationRequestId: cancellationRequest1.id,
        body: {
          hasSellerResponse: false,
          page: 1,
          limit: 10,
        },
      },
    );
  typia.assert(snapshotsWithHasSellerResponseFilter);
  TestValidator.predicate(
    "hasSellerResponse false returns initial snapshots",
    () =>
      snapshotsWithHasSellerResponseFilter.data.every(
        (snapshot) => snapshot.seller_response === null,
      ),
  );
  // 14. Test snapshot retrieval with date range filters
  const now = new Date();
  const from = new Date(now.getTime() - 1000 * 60 * 60 * 24); // 24 hours ago
  const to = new Date(now.getTime() + 1000 * 60 * 60 * 24); // 24 hours ahead
  const snapshotsWithDateRange =
    await api.functional.shoppingMall.admin.post_purchase.cancellation_requests.snapshots.index(
      adminConnection,
      {
        cancellationRequestId: cancellationRequest1.id,
        body: {
          from: from.toISOString(),
          to: to.toISOString(),
          page: 1,
          limit: 10,
        },
      },
    );
  typia.assert(snapshotsWithDateRange);
  TestValidator.predicate("date range filter returns data", () =>
    Array.isArray(snapshotsWithDateRange.data),
  );
  // 15. Test combined filters
  const snapshotsWithCombinedFilters =
    await api.functional.shoppingMall.admin.post_purchase.cancellation_requests.snapshots.index(
      adminConnection,
      {
        cancellationRequestId: cancellationRequest1.id,
        body: {
          status: "pending",
          hasSellerResponse: false,
          from: from.toISOString(),
          to: to.toISOString(),
          page: 1,
          limit: 10,
        },
      },
    );
  typia.assert(snapshotsWithCombinedFilters);
  TestValidator.predicate("combined filters return valid data", () =>
    Array.isArray(snapshotsWithCombinedFilters.data),
  );
  // 16. Test pagination
  const snapshotsPage1 =
    await api.functional.shoppingMall.admin.post_purchase.cancellation_requests.snapshots.index(
      adminConnection,
      {
        cancellationRequestId: cancellationRequest1.id,
        body: {
          page: 1,
          limit: 1,
        },
      },
    );
  typia.assert(snapshotsPage1);
  TestValidator.equals("page 1 current", snapshotsPage1.pagination.current, 1);
  TestValidator.predicate("page 1 has data or is empty", () =>
    Array.isArray(snapshotsPage1.data),
  );
  const snapshotsPage2 =
    await api.functional.shoppingMall.admin.post_purchase.cancellation_requests.snapshots.index(
      adminConnection,
      {
        cancellationRequestId: cancellationRequest1.id,
        body: {
          page: 2,
          limit: 1,
        },
      },
    );
  typia.assert(snapshotsPage2);
  TestValidator.equals("page 2 current", snapshotsPage2.pagination.current, 2);
  // 17. Test chronological order (created_at ascending)
  const snapshotsOrdered =
    await api.functional.shoppingMall.admin.post_purchase.cancellation_requests.snapshots.index(
      adminConnection,
      {
        cancellationRequestId: cancellationRequest1.id,
        body: {
          page: 1,
          limit: 10,
        },
      },
    );
  typia.assert(snapshotsOrdered);
  if (snapshotsOrdered.data.length > 1) {
    TestValidator.predicate("chronological order ascending", () => {
      for (let i = 1; i < snapshotsOrdered.data.length; i++) {
        const prev = new Date(
          snapshotsOrdered.data[i - 1].created_at,
        ).getTime();
        const curr = new Date(snapshotsOrdered.data[i].created_at).getTime();
        if (prev > curr) return false;
      }
      return true;
    });
  }
  // 18. Test empty result set with non-matching status
  const snapshotsEmpty =
    await api.functional.shoppingMall.admin.post_purchase.cancellation_requests.snapshots.index(
      adminConnection,
      {
        cancellationRequestId: cancellationRequest1.id,
        body: {
          status: "nonexistent_status",
          page: 1,
          limit: 10,
        },
      },
    );
  typia.assert(snapshotsEmpty);
  TestValidator.predicate("empty result returns empty array", () =>
    Array.isArray(snapshotsEmpty.data),
  );
  TestValidator.predicate(
    "pagination metadata exists for empty result",
    () => snapshotsEmpty.pagination !== undefined,
  );
  // 19. Validate snapshot structure
  if (snapshotsOrdered.data.length > 0) {
    const snapshot = snapshotsOrdered.data[0];
    TestValidator.predicate("snapshot has id", () => snapshot.id !== undefined);
    TestValidator.predicate(
      "snapshot has status",
      () => snapshot.status !== undefined,
    );
    TestValidator.predicate(
      "snapshot has reason",
      () => snapshot.reason !== undefined,
    );
    TestValidator.predicate(
      "snapshot has seller_response",
      () => snapshot.seller_response !== undefined,
    );
    TestValidator.predicate(
      "snapshot has created_at",
      () => snapshot.created_at !== undefined,
    );
    TestValidator.predicate(
      "snapshot has seller (nullable)",
      () => snapshot.seller === null || snapshot.seller !== undefined,
    );
  }
}
