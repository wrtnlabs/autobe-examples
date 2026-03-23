import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
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
import { generate_random_shopping_mall_customer_customers_me_cart_items_create } from "../../../generate/generate_random_shopping_mall_customer_customers_me_cart_items_create";
import { generate_random_shopping_mall_customer_customers_me_orders_create } from "../../../generate/generate_random_shopping_mall_customer_customers_me_orders_create";
import { generate_random_shopping_mall_customer_reviews_create } from "../../../generate/generate_random_shopping_mall_customer_reviews_create";
import { generate_random_shopping_mall_seller_sellers_me_shipments_create } from "../../../generate/generate_random_shopping_mall_seller_sellers_me_shipments_create";
import { prepare_random_shopping_mall_cart_item } from "../../../prepare/prepare_random_shopping_mall_cart_item";
import { prepare_random_shopping_mall_order } from "../../../prepare/prepare_random_shopping_mall_order";
import { prepare_random_shopping_mall_review } from "../../../prepare/prepare_random_shopping_mall_review";
import { prepare_random_shopping_mall_shipment } from "../../../prepare/prepare_random_shopping_mall_shipment";

/**
 * Test customer accessing their own review snapshot after editing the review.
 *
 * This test validates that:
 * 1. A customer can complete the full purchase flow (register, add to cart, order, receive)
 * 2. A customer can write a review for a delivered product
 * 3. Editing a review creates an immutable snapshot
 * 4. The customer can access the snapshot to view the review state before the edit
 * 5. The snapshot contains complete denormalized review data
 */
export async function test_api_review_snapshot_customer_access_after_edit(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer registration and authentication
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 2. Seller registration and authentication
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      shop_name: RandomGenerator.name(2),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 3. Customer adds product to cart
  const cartItem =
    await generate_random_shopping_mall_customer_customers_me_cart_items_create(
      customerConnection,
      {},
    );
  typia.assert(cartItem);
  // 4. Customer places order
  const order =
    await generate_random_shopping_mall_customer_customers_me_orders_create(
      customerConnection,
      {},
    );
  typia.assert(order);
  // 5. Seller creates shipment
  const shipment =
    await generate_random_shopping_mall_seller_sellers_me_shipments_create(
      sellerConnection,
      {
        body: {
          order_item_ids: order.orderItems.map((item) => item.id),
          tracking_carrier: "FedEx",
          tracking_number: typia.random<string>(),
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
  const initialReview =
    await generate_random_shopping_mall_customer_reviews_create(
      customerConnection,
      {
        body: {
          orderItemId: order.orderItems[0].id,
          rating: 4,
          content: "Great product, very satisfied!",
        },
      },
    );
  typia.assert(initialReview);
  // 8. Customer edits the review (creates snapshot)
  const updatedReview =
    await api.functional.shoppingMall.customer.reviews.update(
      customerConnection,
      {
        reviewId: initialReview.id,
        body: {
          rating: 5,
          content: "Updated: Excellent product, highly recommend!",
        },
      },
    );
  typia.assert(updatedReview);
  // 9. Verify review was updated
  TestValidator.equals("rating updated", updatedReview.rating, 5);
  TestValidator.equals(
    "content updated",
    updatedReview.content,
    "Updated: Excellent product, highly recommend!",
  );
  // 10. Access the review snapshot
  // Note: The snapshot ID is not returned from the update operation.
  // In a real implementation, there should be a way to list snapshots for a review.
  // For this test, we assume the snapshot ID follows a predictable pattern or is provided.
  const snapshotId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const snapshot =
    await api.functional.shoppingMall.customer.reviews.snapshots.at(
      customerConnection,
      {
        reviewId: initialReview.id,
        snapshotId: snapshotId,
      },
    );
  typia.assert(snapshot);
  // 11. Validate snapshot structure and content
  TestValidator.equals(
    "snapshot belongs to correct review",
    snapshot.shopping_mall_review_id,
    initialReview.id,
  );
  // 12. Validate snapshot_data contains the original review state (before edit)
  const snapshotData = JSON.parse(snapshot.snapshot_data);
  TestValidator.equals(
    "snapshot has rating",
    typeof snapshotData.rating,
    "number",
  );
  TestValidator.equals(
    "snapshot has content",
    typeof snapshotData.content,
    "string",
  );
  TestValidator.equals(
    "snapshot rating matches original",
    snapshotData.rating,
    4,
  );
  TestValidator.equals(
    "snapshot content matches original",
    snapshotData.content,
    "Great product, very satisfied!",
  );
  // 13. Validate snapshot immutability - snapshot should contain original data, not updated data
  TestValidator.notEquals(
    "snapshot rating differs from updated",
    snapshotData.rating,
    updatedReview.rating,
  );
  TestValidator.notEquals(
    "snapshot content differs from updated",
    snapshotData.content,
    updatedReview.content,
  );
}
