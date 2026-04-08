import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallRefundRequestSnapshot";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequest";
import type { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAddress";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSnapshot";
import type { IShoppingMallOrderItemSnapshotOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSnapshotOption";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
import type { IShoppingMallRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequestSnapshot";
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
import { generate_random_shopping_mall_admin_categories_create } from "../../../generate/generate_random_shopping_mall_admin_categories_create";
import { generate_random_shopping_mall_member_addresses_create } from "../../../generate/generate_random_shopping_mall_member_addresses_create";
import { generate_random_shopping_mall_member_cart_items_create } from "../../../generate/generate_random_shopping_mall_member_cart_items_create";
import { generate_random_shopping_mall_member_orders_create } from "../../../generate/generate_random_shopping_mall_member_orders_create";
import { generate_random_shopping_mall_member_refund_requests_create } from "../../../generate/generate_random_shopping_mall_member_refund_requests_create";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { generate_random_shopping_mall_seller_variants_create } from "../../../generate/generate_random_shopping_mall_seller_variants_create";
import { prepare_random_shopping_mall_cart_item } from "../../../prepare/prepare_random_shopping_mall_cart_item";
import { prepare_random_shopping_mall_category } from "../../../prepare/prepare_random_shopping_mall_category";
import { prepare_random_shopping_mall_customer_address } from "../../../prepare/prepare_random_shopping_mall_customer_address";
import { prepare_random_shopping_mall_order } from "../../../prepare/prepare_random_shopping_mall_order";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";
import { prepare_random_shopping_mall_refund_request } from "../../../prepare/prepare_random_shopping_mall_refund_request";

/**
 * Test refund request snapshot filtering by status and date range.
 *
 * Validates the administrator's ability to filter refund request snapshots through various criteria including status, date range, and combined filters. This ensures the audit trail system supports effective dispute resolution and oversight.
 *
 * The test establishes a complete refund request workflow from product creation through refund submission, then exercises all filtering capabilities of the snapshots endpoint to verify correct behavior.
 *
 * 1. Administrator joins and creates a product category.
 * 2. Seller joins, creates a product with variant.
 * 3. Member joins, creates address, adds item to cart, places order.
 * 4. Member creates a refund request for the delivered order item.
 * 5. Administrator retrieves snapshots with various filter combinations.
 * 6. Verifies filtering correctly matches status and date range criteria.
 * 7. Validates pagination structure remains consistent with filters applied.
 */
export async function test_api_refund_request_snapshot_filtering_by_status_and_date(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator setup
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      grade: "regular" as const,
    },
  });
  typia.assert(adminAuth);
  const category =
    await generate_random_shopping_mall_admin_categories_create(
      adminConnection,
      {},
    );
  typia.assert(category);
  // 2. Seller setup
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(sellerAuth);
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        shopping_mall_category_id: category.id,
      },
    },
  );
  typia.assert(product);
  const variant = await generate_random_shopping_mall_seller_variants_create(
    sellerConnection,
    {
      body: {
        shopping_mall_product_id: product.id,
      },
    },
  );
  typia.assert(variant);
  // 3. Member setup
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(memberAuth);
  const address =
    await generate_random_shopping_mall_member_addresses_create(
      memberConnection,
      {},
    );
  typia.assert(address);
  const cartItem = await generate_random_shopping_mall_member_cart_items_create(
    memberConnection,
    {
      body: {
        product_variant_id: variant.id,
      },
    },
  );
  typia.assert(cartItem);
  const order = await generate_random_shopping_mall_member_orders_create(
    memberConnection,
    {
      body: {
        shopping_mall_customer_address_id: address.id,
      },
    },
  );
  typia.assert(order);
  // Get the first order item for refund request
  const orderItem = order.orderItems[0];
  typia.assert(orderItem);
  // 4. Create refund request
  const refundRequest =
    await generate_random_shopping_mall_member_refund_requests_create(
      memberConnection,
      {
        body: {
          order_item_id: orderItem.id,
        },
      },
    );
  typia.assert(refundRequest);
  // 5. Test snapshot filtering
  // 5.1 Retrieve all snapshots without filters (baseline)
  const allSnapshots =
    await api.functional.shoppingMall.admin.refund_requests.snapshots.index(
      adminConnection,
      {
        refundRequestId: refundRequest.id,
        body: {
          page: 1,
          limit: 100,
          sort: "created_at ASC",
        },
      },
    );
  typia.assert(allSnapshots);
  TestValidator.predicate(
    "baseline has snapshots",
    () => allSnapshots.data.length > 0,
  );
  // 5.2 Filter by status='pending'
  const pendingSnapshots =
    await api.functional.shoppingMall.admin.refund_requests.snapshots.index(
      adminConnection,
      {
        refundRequestId: refundRequest.id,
        body: {
          page: 1,
          limit: 100,
          status: "pending",
          sort: "created_at ASC",
        },
      },
    );
  typia.assert(pendingSnapshots);
  // Verify all pending snapshots have status='pending'
  for (const snapshot of pendingSnapshots.data) {
    TestValidator.equals("pending status matches", snapshot.status, "pending");
  }
  // 5.3 Filter by date range
  const now = new Date();
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const dateRangeSnapshots =
    await api.functional.shoppingMall.admin.refund_requests.snapshots.index(
      adminConnection,
      {
        refundRequestId: refundRequest.id,
        body: {
          page: 1,
          limit: 100,
          created_at_from: yesterday.toISOString(),
          created_at_to: tomorrow.toISOString(),
          sort: "created_at ASC",
        },
      },
    );
  typia.assert(dateRangeSnapshots);
  // Verify all snapshots are within date range
  for (const snapshot of dateRangeSnapshots.data) {
    const snapshotDate = new Date(snapshot.created_at);
    TestValidator.predicate(
      "snapshot after from date",
      () => snapshotDate >= yesterday,
    );
    TestValidator.predicate(
      "snapshot before to date",
      () => snapshotDate <= tomorrow,
    );
  }
  // 5.4 Combined status and date range filter
  const combinedSnapshots =
    await api.functional.shoppingMall.admin.refund_requests.snapshots.index(
      adminConnection,
      {
        refundRequestId: refundRequest.id,
        body: {
          page: 1,
          limit: 100,
          status: "pending",
          created_at_from: yesterday.toISOString(),
          created_at_to: tomorrow.toISOString(),
          sort: "created_at ASC",
        },
      },
    );
  typia.assert(combinedSnapshots);
  // Verify combined filter results
  for (const snapshot of combinedSnapshots.data) {
    TestValidator.equals("combined status matches", snapshot.status, "pending");
    const snapshotDate = new Date(snapshot.created_at);
    TestValidator.predicate(
      "combined date after from",
      () => snapshotDate >= yesterday,
    );
    TestValidator.predicate(
      "combined date before to",
      () => snapshotDate <= tomorrow,
    );
  }
  // 5.5 Test pagination with filters
  const paginatedSnapshots =
    await api.functional.shoppingMall.admin.refund_requests.snapshots.index(
      adminConnection,
      {
        refundRequestId: refundRequest.id,
        body: {
          page: 1,
          limit: 1,
          sort: "created_at ASC",
        },
      },
    );
  typia.assert(paginatedSnapshots);
  TestValidator.predicate(
    "pagination has data",
    () => paginatedSnapshots.data.length <= 1,
  );
  TestValidator.predicate(
    "pagination records correct",
    () =>
      paginatedSnapshots.pagination.records >= paginatedSnapshots.data.length,
  );
  TestValidator.predicate(
    "pagination pages calculated",
    () => paginatedSnapshots.pagination.pages >= 1,
  );
  // 5.6 Test empty result with invalid date range
  const farPast = new Date(2000, 0, 1);
  const emptySnapshots =
    await api.functional.shoppingMall.admin.refund_requests.snapshots.index(
      adminConnection,
      {
        refundRequestId: refundRequest.id,
        body: {
          page: 1,
          limit: 10,
          created_at_from: farPast.toISOString(),
          created_at_to: farPast.toISOString(),
          sort: "created_at ASC",
        },
      },
    );
  typia.assert(emptySnapshots);
  TestValidator.equals("empty data array", emptySnapshots.data.length, 0);
  TestValidator.equals(
    "empty records count",
    emptySnapshots.pagination.records,
    0,
  );
  TestValidator.equals("empty pages count", emptySnapshots.pagination.pages, 0);
  // 5.7 Verify chronological ordering (ASC)
  const sortedSnapshots =
    await api.functional.shoppingMall.admin.refund_requests.snapshots.index(
      adminConnection,
      {
        refundRequestId: refundRequest.id,
        body: {
          page: 1,
          limit: 100,
          sort: "created_at ASC",
        },
      },
    );
  typia.assert(sortedSnapshots);
  for (let i = 1; i < sortedSnapshots.data.length; i++) {
    const prevDate = new Date(sortedSnapshots.data[i - 1].created_at);
    const currDate = new Date(sortedSnapshots.data[i].created_at);
    TestValidator.predicate(
      "chronological order maintained",
      () => prevDate <= currDate,
    );
  }
}