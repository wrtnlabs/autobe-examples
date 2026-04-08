import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import type { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import type { IEcommerceOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrder";
import type { IEcommerceOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrderItem";
import type { IEcommerceProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProduct";
import type { IEcommerceProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProductVariant";
import type { IEcommerceReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceReview";
import type { IEcommerceReviewSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceReviewSnapshot";
import type { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceReviewSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceReviewSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_ecommerce_customer_reviews_create } from "../../../generate/generate_random_ecommerce_customer_reviews_create";
import { prepare_random_ecommerce_review } from "../../../prepare/prepare_random_ecommerce_review";

/**
 * Test customer review snapshot retrieval after multiple edits.
 *
 * Validates the complete review snapshot creation and retrieval system by testing a customer's ability to edit their review and retrieve the historical snapshot records. The test ensures that each edit triggers proper snapshot creation with accurate rating and content capture.
 *
 * This test validates the audit trail functionality for review modifications, ensuring that all historical states are preserved and retrievable in the correct chronological order.
 *
 * 1. Customer authenticates via join endpoint.
 * 2. Customer creates an initial review with rating 3 and content "Initial review".
 * 3. Customer edits the review to rating 4 with content "Updated review".
 * 4. Customer edits the review again to rating 5 with null content.
 * 5. Customer retrieves snapshot history for the review.
 * 6. Validates multiple snapshots are returned in descending order by created_at.
 * 7. Validates each snapshot contains correct rating and content values.
 * 8. Validates pagination metadata shows correct total count.
 */
export async function test_api_review_snapshot_retrieval_after_edit(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer authentication
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceCustomer.IJoin,
  });
  typia.assert(customer);
  // 2. Create initial review (requires a delivered order item - using utility function)
  const review = await generate_random_ecommerce_customer_reviews_create(
    customerConnection,
    {
      body: {
        rating: 3,
        content: "Initial review content",
      },
    },
  );
  typia.assert(review);
  // 3. First edit - change rating to 4 and update content
  await api.functional.ecommerce.customer.reviews.update(customerConnection, {
    reviewId: review.id,
    body: {
      rating: 4,
      content: "Updated review content",
    } satisfies IEcommerceReview.IUpdate,
  });
  // 4. Second edit - change rating to 5 and set content to null
  await api.functional.ecommerce.customer.reviews.update(customerConnection, {
    reviewId: review.id,
    body: {
      rating: 5,
      content: null,
    } satisfies IEcommerceReview.IUpdate,
  });
  // 5. Retrieve snapshot history
  const snapshots =
    await api.functional.ecommerce.customer.reviews.snapshots.index(
      customerConnection,
      {
        reviewId: review.id,
        body: {} satisfies IEcommerceReviewSnapshot.IRequest,
      },
    );
  typia.assert(snapshots);
  // 6. Validate multiple snapshots returned
  TestValidator.predicate(
    "multiple snapshots exist",
    snapshots.data.length >= 2,
  );
  // 7. Validate snapshots ordered by created_at descending (newest first)
  for (let i = 0; i < snapshots.data.length - 1; i++) {
    TestValidator.predicate(
      `snapshot ${i} is newer than snapshot ${i + 1}`,
      snapshots.data[i].created_at >= snapshots.data[i + 1].created_at,
    );
  }
  // 8. Validate snapshot contents (rating and content values)
  // The snapshots should contain the historical states before each edit
  // First snapshot (newest) should have rating 5 and content null
  // Second snapshot should have rating 4 and content "Updated review content"
  // Third snapshot (oldest) should have rating 3 and content "Initial review content"
  if (snapshots.data.length >= 3) {
    const newest = snapshots.data[0];
    const middle = snapshots.data[1];
    const oldest = snapshots.data[2];
    TestValidator.equals("newest snapshot rating", newest.rating, 5);
    TestValidator.equals("newest snapshot content", newest.content, null);
    TestValidator.equals("middle snapshot rating", middle.rating, 4);
    TestValidator.equals(
      "middle snapshot content",
      middle.content,
      "Updated review content",
    );
    TestValidator.equals("oldest snapshot rating", oldest.rating, 3);
    TestValidator.equals(
      "oldest snapshot content",
      oldest.content,
      "Initial review content",
    );
  }
  // 9. Validate pagination metadata
  TestValidator.equals(
    "pagination records count matches data length",
    snapshots.pagination.records,
    snapshots.data.length,
  );
  TestValidator.predicate(
    "pagination current page is 1",
    snapshots.pagination.current === 1,
  );
  TestValidator.predicate(
    "pagination limit is positive",
    snapshots.pagination.limit > 0,
  );
}