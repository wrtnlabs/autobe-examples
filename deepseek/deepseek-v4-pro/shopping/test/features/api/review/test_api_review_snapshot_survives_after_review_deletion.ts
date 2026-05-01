import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequest";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryRecord";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallOrderItemProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemProductSnapshot";
import type { IShoppingMallOrderItemProductSnapshotImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemProductSnapshotImage";
import type { IShoppingMallOrderItemSellerSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSellerSnapshot";
import type { IShoppingMallOrderItemVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemVariantSnapshot";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOptionValue";
import type { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
import type { IShoppingMallReviewReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReviewReview";
import type { IShoppingMallReviewReviewSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReviewReviewSnapshot";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_admin_categories_create } from "../../../generate/generate_random_shopping_mall_admin_categories_create";
import { generate_random_shopping_mall_customer_orders_create } from "../../../generate/generate_random_shopping_mall_customer_orders_create";
import { generate_random_shopping_mall_customer_reviews_create } from "../../../generate/generate_random_shopping_mall_customer_reviews_create";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { generate_random_shopping_mall_seller_products_variants_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_create";
import { generate_random_shopping_mall_seller_products_variants_inventory_records_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_inventory_records_create";
import { prepare_random_shopping_mall_category } from "../../../prepare/prepare_random_shopping_mall_category";
import { prepare_random_shopping_mall_inventory_record } from "../../../prepare/prepare_random_shopping_mall_inventory_record";
import { prepare_random_shopping_mall_order } from "../../../prepare/prepare_random_shopping_mall_order";
import { prepare_random_shopping_mall_order_item } from "../../../prepare/prepare_random_shopping_mall_order_item";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";
import { prepare_random_shopping_mall_product_variant_option_value } from "../../../prepare/prepare_random_shopping_mall_product_variant_option_value";
import { prepare_random_shopping_mall_review_review } from "../../../prepare/prepare_random_shopping_mall_review_review";

/**
 * Test that a review snapshot survives after the parent review is soft-deleted.
 *
 * Validates the snapshot immutability and preservation rules (Section 571): when a customer edits their review, an immutable snapshot is created capturing the previous rating and content. Even after the customer soft-deletes the review, all associated snapshots remain preserved and accessible to administrators through the admin snapshot retrieval endpoint.
 *
 * This test confirms the complete lifecycle: review creation → edit (snapshot creation) → soft-deletion → admin snapshot retrieval. The snapshot data must exactly match the pre-edit review state — the original rating of 5 and original content — demonstrating that snapshots are frozen at edit time and never modified or destroyed, regardless of the parent review's deletion status.
 *
 * 1. Administrator registers and creates a product category.
 * 2. Seller registers, creates a product under the category, adds a variant with initial stock.
 * 3. Customer registers, places an order for the variant, writes a review with rating 5.
 * 4. Customer edits the review to rating 4, triggering automatic snapshot creation.
 * 5. Customer soft-deletes the review.
 * 6. Administrator retrieves the snapshot and validates its data matches the pre-edit state.
 */
export async function test_api_review_snapshot_survives_after_review_deletion(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup — create category
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  const category = await generate_random_shopping_mall_admin_categories_create(
    adminConnection,
    {},
  );
  typia.assert(category);
  // 2. Seller setup — create product, variant, and stock
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {});
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        shopping_mall_category_id: category.id,
      },
    },
  );
  typia.assert(product);
  const variant =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          initialStockQuantity: 10,
        },
      },
    );
  typia.assert(variant);
  // 3. Customer setup — place order and write review
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {});
  const order = await generate_random_shopping_mall_customer_orders_create(
    customerConnection,
    {
      body: {
        items: [
          {
            variant_id: variant.id,
            quantity: 1,
          } satisfies IShoppingMallOrderItem.ICreate,
        ],
      },
    },
  );
  typia.assert(order);
  const orderItem = order.items[0];
  typia.assertGuard(orderItem);
  const originalRating = 5 satisfies number &
    tags.Type<"int32"> &
    tags.Minimum<1> &
    tags.Maximum<5>;
  const originalContent = "Great product, highly recommended!";
  const review = await generate_random_shopping_mall_customer_reviews_create(
    customerConnection,
    {
      body: {
        shopping_mall_product_id: product.id,
        shopping_mall_order_id: order.id,
        shopping_mall_order_item_id: orderItem.id,
        rating: originalRating,
        content: originalContent,
      },
    },
  );
  typia.assert(review);
  // 4. Edit review — creates immutable snapshot of pre-edit state
  const updatedReview =
    await api.functional.shoppingMall.customer.reviews.update(
      customerConnection,
      {
        reviewId: review.id,
        body: {
          rating: 4 satisfies number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<5>,
          content: "Updated: still good but not perfect.",
        } satisfies IShoppingMallReviewReview.IUpdate,
      },
    );
  typia.assert(updatedReview);
  const snapshot = updatedReview.snapshots[0];
  typia.assertGuard(snapshot);
  // 5. Soft-delete the review
  await api.functional.shoppingMall.customer.reviews.erase(customerConnection, {
    reviewId: review.id,
  });
  // 6. Admin retrieves snapshot after review deletion
  const retrievedSnapshot =
    await api.functional.shoppingMall.admin.reviews.snapshots.at(
      adminConnection,
      {
        reviewId: review.id,
        snapshotId: snapshot.id,
      },
    );
  typia.assert(retrievedSnapshot);
  // 7. Validate snapshot integrity
  TestValidator.equals(
    "snapshot id preserved",
    retrievedSnapshot.id,
    snapshot.id,
  );
  TestValidator.equals(
    "snapshot rating matches pre-edit value",
    retrievedSnapshot.rating,
    originalRating,
  );
  TestValidator.equals(
    "snapshot content matches pre-edit value",
    retrievedSnapshot.content,
    originalContent,
  );
  TestValidator.predicate(
    "snapshot created_at is a valid timestamp",
    () =>
      typeof retrievedSnapshot.created_at === "string" &&
      retrievedSnapshot.created_at.length > 0,
  );
}
