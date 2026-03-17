import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallReviewSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallReviewSnapshot";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductReviewStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductReviewStatistic";
import type { IShoppingMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshot";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOption";
import type { IShoppingMallProductVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantSnapshot";
import type { IShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReview";
import type { IShoppingMallReviewSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReviewSnapshot";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
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
import { generate_random_shopping_mall_customer_customers_order_items_review_create } from "../../../generate/generate_random_shopping_mall_customer_customers_order_items_review_create";
import { generate_random_shopping_mall_customer_orders_create } from "../../../generate/generate_random_shopping_mall_customer_orders_create";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { generate_random_shopping_mall_seller_shipments_create } from "../../../generate/generate_random_shopping_mall_seller_shipments_create";
import { prepare_random_shopping_mall_order } from "../../../prepare/prepare_random_shopping_mall_order";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_review } from "../../../prepare/prepare_random_shopping_mall_review";
import { prepare_random_shopping_mall_shipment } from "../../../prepare/prepare_random_shopping_mall_shipment";

/**
 * Test seller review snapshot pagination with multiple edits.
 *
 * This test verifies that when a customer edits a review multiple times,
 * the seller can retrieve all snapshots with proper pagination.
 *
 * Setup:
 * 1. Seller creates product
 * 2. Customer orders product
 * 3. Seller ships order
 * 4. Customer confirms delivery
 * 5. Customer creates review
 * 6. Customer edits review 25 times
 *
 * Test:
 * - Seller retrieves snapshots in 3 pages (10, 10, 5)
 * - Validates pagination metadata
 * - Validates no duplicates across pages
 * - Validates snapshot data integrity
 */
export async function test_api_seller_review_snapshot_pagination_with_multiple_edits(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller setup - register and login
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerJoin = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      shop_name: RandomGenerator.name(),
      shop_description: RandomGenerator.paragraph({ sentences: 2 }),
    },
  });
  typia.assert(sellerJoin);
  // 2. Seller creates a product
  const product = await api.functional.shoppingMall.seller.products.create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        shopping_category_id: typia.random<string & tags.Format<"uuid">>(),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert(product);
  // 3. Customer setup - register and login
  const customerConnection: api.IConnection = { host: connection.host };
  const customerJoin = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      nickname: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: null,
    },
  });
  typia.assert(customerJoin);
  // 4. Customer creates order (using generation function for cart-based order)
  const order = await generate_random_shopping_mall_customer_orders_create(
    customerConnection,
    {
      body: {
        addressId: typia.random<string & tags.Format<"uuid">>(),
      },
    },
  );
  typia.assert(order);
  // Get the first order item for review
  const orderItem = order.items[0];
  typia.assert(orderItem);
  // 5. Seller creates shipment for the order item
  const shipment = await generate_random_shopping_mall_seller_shipments_create(
    sellerConnection,
    {
      body: {
        order_item_ids: [orderItem.id],
        tracking_carrier: "TestCarrier",
        tracking_number: RandomGenerator.alphaNumeric(12),
      },
    },
  );
  typia.assert(shipment);
  // 6. Customer confirms delivery
  const confirmedShipment =
    await api.functional.shoppingMall.customer.shipments.confirm_delivery.confirmDelivery(
      customerConnection,
      {
        shipmentId: shipment.id,
      },
    );
  typia.assert(confirmedShipment);
  // 7. Customer creates initial review
  const review =
    await generate_random_shopping_mall_customer_customers_order_items_review_create(
      customerConnection,
      {
        body: {
          rating: 5,
          content: "Initial review content",
        },
        params: {
          orderItemId: orderItem.id,
        },
      },
    );
  typia.assert(review);
  // 8. Customer edits review 25 times to create 25 snapshots
  const editCount = 25;
  for (let i = 1; i <= editCount; i++) {
    const updatedReview =
      await api.functional.shoppingMall.customer.reviews.update(
        customerConnection,
        {
          reviewId: review.id,
          body: {
            rating: ((i % 5) + 1) as 1 | 2 | 3 | 4 | 5,
            content: `Updated review content - edit #${i}`,
          } satisfies IShoppingMallReview.IUpdate,
        },
      );
    typia.assert(updatedReview);
  }
  // 9. Seller retrieves snapshots - Page 1
  const page1Response =
    await api.functional.shoppingMall.seller.reviews.snapshots.index(
      sellerConnection,
      {
        reviewId: review.id,
        body: {
          page: 1,
          limit: 10,
        } satisfies IShoppingMallReviewSnapshot.IRequest,
      },
    );
  typia.assert(page1Response);
  // 10. Seller retrieves snapshots - Page 2
  const page2Response =
    await api.functional.shoppingMall.seller.reviews.snapshots.index(
      sellerConnection,
      {
        reviewId: review.id,
        body: {
          page: 2,
          limit: 10,
        } satisfies IShoppingMallReviewSnapshot.IRequest,
      },
    );
  typia.assert(page2Response);
  // 11. Seller retrieves snapshots - Page 3
  const page3Response =
    await api.functional.shoppingMall.seller.reviews.snapshots.index(
      sellerConnection,
      {
        reviewId: review.id,
        body: {
          page: 3,
          limit: 10,
        } satisfies IShoppingMallReviewSnapshot.IRequest,
      },
    );
  typia.assert(page3Response);
  // 12. Validate pagination metadata
  TestValidator.equals("Page 1 current", page1Response.pagination.current, 1);
  TestValidator.equals("Page 1 limit", page1Response.pagination.limit, 10);
  TestValidator.equals("Page 1 records", page1Response.pagination.records, 25);
  TestValidator.equals("Page 1 pages", page1Response.pagination.pages, 3);
  TestValidator.equals("Page 2 current", page2Response.pagination.current, 2);
  TestValidator.equals("Page 2 limit", page2Response.pagination.limit, 10);
  TestValidator.equals("Page 2 records", page2Response.pagination.records, 25);
  TestValidator.equals("Page 2 pages", page2Response.pagination.pages, 3);
  TestValidator.equals("Page 3 current", page3Response.pagination.current, 3);
  TestValidator.equals("Page 3 limit", page3Response.pagination.limit, 10);
  TestValidator.equals("Page 3 records", page3Response.pagination.records, 25);
  TestValidator.equals("Page 3 pages", page3Response.pagination.pages, 3);
  // 13. Validate page data counts
  TestValidator.equals("Page 1 data count", page1Response.data.length, 10);
  TestValidator.equals("Page 2 data count", page2Response.data.length, 10);
  TestValidator.equals("Page 3 data count", page3Response.data.length, 5);
  // 14. Validate no duplicate snapshots across pages
  const allSnapshotIds = [
    ...page1Response.data.map((s) => s.id),
    ...page2Response.data.map((s) => s.id),
    ...page3Response.data.map((s) => s.id),
  ];
  const uniqueSnapshotIds = new Set(allSnapshotIds);
  TestValidator.equals(
    "No duplicate snapshots",
    uniqueSnapshotIds.size,
    allSnapshotIds.length,
  );
  // 15. Validate each snapshot has required fields
  const allSnapshots = [
    ...page1Response.data,
    ...page2Response.data,
    ...page3Response.data,
  ];
  for (const snapshot of allSnapshots) {
    typia.assert(snapshot);
    TestValidator.predicate(
      "Snapshot has valid rating",
      snapshot.rating >= 1 && snapshot.rating <= 5,
    );
    TestValidator.predicate(
      "Snapshot has valid snapshot_at",
      snapshot.snapshot_at !== null && snapshot.snapshot_at !== undefined,
    );
    TestValidator.predicate(
      "Snapshot has snapshotByUser",
      snapshot.snapshotByUser !== null && snapshot.snapshotByUser !== undefined,
    );
  }
  // 16. Validate snapshots are sorted by snapshot_at descending
  for (let i = 0; i < allSnapshots.length - 1; i++) {
    const current = new Date(allSnapshots[i].snapshot_at).getTime();
    const next = new Date(allSnapshots[i + 1].snapshot_at).getTime();
    TestValidator.predicate(
      `Snapshots sorted descending (${i} -> ${i + 1})`,
      current >= next,
    );
  }
}
