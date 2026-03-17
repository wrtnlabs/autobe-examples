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
 * Test that a seller can still retrieve snapshots for a review even after the customer has deleted the review,
 * verifying that snapshot preservation works correctly for dispute resolution purposes.
 *
 * **Setup Prerequisites:**
 * 1. Seller registers and logs in
 * 2. Seller creates a product with at least one variant
 * 3. Customer registers and logs in
 * 4. Customer adds the product variant to cart and completes checkout
 * 5. Seller creates shipment for the order item
 * 6. Customer confirms delivery of the shipment
 * 7. Customer creates initial review for the delivered order item (rating 5, content "Excellent quality")
 * 8. Customer updates the review (rating 4, content "Good quality") - creates first snapshot
 * 9. Customer deletes the review - creates second snapshot and soft-deletes the review
 *
 * **Test Execution:**
 * Seller calls PATCH /shoppingMall/seller/reviews/{reviewId}/snapshots with the review ID from step 7 (after the review has been deleted).
 *
 * **Validation Points:**
 * - Response returns HTTP 200 with paginated snapshot list (access succeeds despite review deletion)
 * - Response contains exactly 2 snapshots (preserved even though review is deleted)
 * - Snapshots are sorted by snapshot_at descending (newest first)
 * - First snapshot shows rating=4, content="Good quality" (state before deletion)
 * - Second snapshot shows rating=5, content="Excellent quality" (original review content)
 * - Each snapshot includes snapshotByUser with the customer's information
 * - Snapshots remain immutable and accessible for audit/dispute resolution
 * - This validates the business rule that snapshots are preserved after review deletion
 */
export async function test_api_seller_review_snapshot_access_after_review_deletion(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller registration and login
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPass123!",
      shop_name: RandomGenerator.name(),
      shop_description: RandomGenerator.paragraph({ sentences: 2 }),
    },
  });
  typia.assert(sellerAuth);
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
      },
    },
  );
  typia.assert(product);
  // 3. Customer registration and login
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPass123!",
      nickname: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: null,
    },
  });
  typia.assert(customerAuth);
  // 4. Customer creates order (using utility function)
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
  TestValidator.predicate("order has items", order.items.length > 0);
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
  // 7. Customer creates initial review (rating 5, content "Excellent quality")
  const review =
    await generate_random_shopping_mall_customer_customers_order_items_review_create(
      customerConnection,
      {
        params: {
          orderItemId: orderItem.id,
        },
        body: {
          rating: 5,
          content: "Excellent quality",
        },
      },
    );
  typia.assert(review);
  // 8. Customer updates the review (rating 4, content "Good quality") - creates first snapshot
  const updatedReview =
    await api.functional.shoppingMall.customer.reviews.update(
      customerConnection,
      {
        reviewId: review.id,
        body: {
          rating: 4,
          content: "Good quality",
        },
      },
    );
  typia.assert(updatedReview);
  // 9. Customer deletes the review - creates second snapshot and soft-deletes the review
  await api.functional.shoppingMall.customer.reviews.erase(customerConnection, {
    reviewId: review.id,
  });
  // Test Execution: Seller retrieves snapshots for the deleted review
  const snapshots =
    await api.functional.shoppingMall.seller.reviews.snapshots.index(
      sellerConnection,
      {
        reviewId: review.id,
        body: {
          page: 1,
          limit: 20,
        },
      },
    );
  typia.assert(snapshots);
  // Validation Points
  TestValidator.predicate(
    "snapshots accessible after review deletion",
    snapshots.data.length > 0,
  );
  TestValidator.equals(
    "exactly 2 snapshots (edit + delete)",
    snapshots.data.length,
    2,
  );
  TestValidator.predicate(
    "snapshots sorted by snapshot_at descending",
    snapshots.data[0].snapshot_at >= snapshots.data[1].snapshot_at,
  );
  // First snapshot (newest) should show rating=4, content="Good quality" (state before deletion)
  TestValidator.equals(
    "first snapshot rating (before deletion)",
    snapshots.data[0].rating,
    4,
  );
  TestValidator.equals(
    "first snapshot content (before deletion)",
    snapshots.data[0].content,
    "Good quality",
  );
  // Second snapshot (oldest) should show rating=5, content="Excellent quality" (original review)
  TestValidator.equals(
    "second snapshot rating (original)",
    snapshots.data[1].rating,
    5,
  );
  TestValidator.equals(
    "second snapshot content (original)",
    snapshots.data[1].content,
    "Excellent quality",
  );
  // Verify snapshotByUser contains customer information
  TestValidator.predicate(
    "first snapshot has customer info",
    snapshots.data[0].snapshotByUser !== null &&
      snapshots.data[0].snapshotByUser !== undefined,
  );
  TestValidator.predicate(
    "second snapshot has customer info",
    snapshots.data[1].snapshotByUser !== null &&
      snapshots.data[1].snapshotByUser !== undefined,
  );
  // Verify pagination metadata
  TestValidator.equals(
    "pagination current page",
    snapshots.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination total records",
    snapshots.pagination.records,
    2,
  );
}
