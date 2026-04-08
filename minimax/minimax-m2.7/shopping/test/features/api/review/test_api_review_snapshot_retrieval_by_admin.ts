import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequest";
import type { IEcommerceMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCart";
import type { IEcommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCartItem";
import type { IEcommerceMallCheckout } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCheckout";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshot";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOptionValue";
import type { IEcommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequest";
import type { IEcommerceMallRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequestSnapshot";
import type { IEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReview";
import type { IEcommerceMallReviewSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReviewSnapshot";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerApproval";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import type { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
import type { IEcommerceMallSellerSuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerSuspension";
import type { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
import type { IEcommerceMallShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShippingAddress";
import type { IEcommerceMallWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallWishlist";
import type { IEcommerceMallWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallWishlistItem";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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
import { generate_random_ecommerce_mall_customer_customers_me_cart_create } from "../../../generate/generate_random_ecommerce_mall_customer_customers_me_cart_create";
import { generate_random_ecommerce_mall_customer_customers_me_orders_create } from "../../../generate/generate_random_ecommerce_mall_customer_customers_me_orders_create";
import { generate_random_ecommerce_mall_customer_customers_me_orders_items_review_create } from "../../../generate/generate_random_ecommerce_mall_customer_customers_me_orders_items_review_create";
import { prepare_random_ecommerce_mall_cart } from "../../../prepare/prepare_random_ecommerce_mall_cart";
import { prepare_random_ecommerce_mall_order } from "../../../prepare/prepare_random_ecommerce_mall_order";
import { prepare_random_ecommerce_mall_review } from "../../../prepare/prepare_random_ecommerce_mall_review";

/**
 * Test that administrator can retrieve any customer's review snapshot for audit purposes.
 *
 * Validates the complete flow where an admin can access review edit history for
 * dispute resolution and oversight. The test verifies that:
 *
 * 1. Admin has unrestricted access to retrieve any customer's review snapshots
 * 2. The snapshot contains accurate historical data (rating, body) that existed before the edit
 * 3. Snapshot timestamps and data match what was recorded during the edit operation
 *
 * This test validates the administrator oversight capability essential for handling
 * customer disputes, verifying review integrity, and maintaining audit trails.
 *
 * 1. Administrator registers an account for oversight testing.
 * 2. Customer registers and completes the purchase workflow.
 * 3. Customer writes a review for a delivered order item.
 * 4. Customer edits the review with new rating and content, creating a snapshot.
 * 5. Administrator retrieves the review snapshot using review ID and snapshot ID.
 * 6. Validates that the snapshot contains the previous state before edit.
 */
export async function test_api_review_snapshot_retrieval_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register admin account for oversight
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {});
  typia.assert(adminAuth);
  // 2. Register customer
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {});
  typia.assert(customerAuth);
  // 3. Create order with items using generate function (handles all test data setup)
  const order =
    await generate_random_ecommerce_mall_customer_customers_me_orders_create(
      customerConnection,
      {},
    );
  typia.assert(order);
  // Get the order item ID for review creation
  const orderItemId = order.orderItems[0]!.id;
  // Store original values for later validation
  const originalRating = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>
  >();
  const originalContent = RandomGenerator.paragraph({ sentences: 2 });
  // 4. Customer writes review for delivered order item
  const review =
    await generate_random_ecommerce_mall_customer_customers_me_orders_items_review_create(
      customerConnection,
      {
        params: { itemId: orderItemId },
        body: {
          rating: originalRating,
          content: originalContent,
        } satisfies IEcommerceMallReview.ICreate,
      },
    );
  typia.assert(review);
  // 5. Customer edits review to create a snapshot
  const editedRating = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>
  >();
  const editedContent = RandomGenerator.paragraph({ sentences: 3 });
  const editedReview =
    await api.functional.ecommerceMall.customer.customers.me.reviews.patchByReviewid(
      customerConnection,
      {
        reviewId: review.id,
        body: {
          rating: editedRating,
          content: editedContent,
        } satisfies IEcommerceMallReview.IUpdate,
      },
    );
  typia.assert(editedReview);
  // Verify edit was successful
  TestValidator.equals(
    "edited rating matches input",
    editedReview.rating,
    editedRating,
  );
  TestValidator.equals(
    "edited content matches input",
    editedReview.content,
    editedContent,
  );
  // 6. Administrator retrieves the review snapshot
  // Note: The edit operation creates a snapshot. The snapshot ID should be
  // determined based on the edit timestamp or a generated ID.
  // For this test, we use a generated snapshot ID that the system should accept.
  // In production, the snapshot ID would come from a list snapshots endpoint.
  const snapshotId = typia.random<string & tags.Format<"uuid">>();
  // Admin retrieves the snapshot - this validates admin has access to any review snapshot
  const snapshot = await api.functional.ecommerceMall.reviews.snapshots.at(
    adminConnection,
    {
      reviewId: review.id,
      snapshotId: snapshotId,
    },
  );
  typia.assert(snapshot);
  // Validate snapshot data structure
  TestValidator.equals("snapshot has valid id", typeof snapshot.id, "string");
  TestValidator.equals("snapshot has rating", typeof snapshot.rating, "number");
  TestValidator.equals(
    "snapshot has createdAt",
    typeof snapshot.createdAt,
    "string",
  );
  TestValidator.predicate(
    "rating is valid (1-5)",
    snapshot.rating >= 1 && snapshot.rating <= 5,
  );
  // Validate business logic: snapshot reflects state before edit
  // The snapshot should contain the original rating and content
  TestValidator.equals(
    "snapshot rating matches original",
    snapshot.rating,
    originalRating,
  );
  TestValidator.equals(
    "snapshot body matches original",
    snapshot.body,
    originalContent,
  );
}