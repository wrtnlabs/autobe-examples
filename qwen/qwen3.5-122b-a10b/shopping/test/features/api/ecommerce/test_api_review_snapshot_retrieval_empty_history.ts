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
 * Test customer review snapshot retrieval with empty history.
 *
 * Validates that retrieving snapshot history for a review that has never been edited returns an empty data array with proper pagination metadata. This edge case ensures the system gracefully handles reviews without any modification history.
 *
 * The test creates a customer, generates a review without any subsequent edits, and then queries the snapshot endpoint to verify empty results are returned correctly.
 *
 * 1. Customer registers and authenticates with the system.
 * 2. Customer creates a review for a purchased product.
 * 3. Customer retrieves snapshot history for the created review.
 * 4. Validates that data array is empty since no edits were made.
 * 5. Validates pagination metadata shows records count of 0.
 */
export async function test_api_review_snapshot_retrieval_empty_history(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer authentication
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123",
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceCustomer.IJoin,
  });
  typia.assert(customer);
  // 2. Create a review (without editing it)
  // Note: This requires a delivered order item. For this test scenario,
  // we would need to generate a complete purchase flow first.
  // Using the generate utility function which handles the full flow.
  const review: IEcommerceReview =
    await generate_random_ecommerce_customer_reviews_create(
      customerConnection,
      {
        body: {
          rating: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>
          >(),
          content: RandomGenerator.paragraph({ sentences: 3 }),
        },
      },
    );
  typia.assert(review);
  // 3. Retrieve snapshot history for the review
  const snapshots: IPageIEcommerceReviewSnapshot.ISummary =
    await api.functional.ecommerce.customer.reviews.snapshots.index(
      customerConnection,
      {
        reviewId: review.id,
        body: {},
      },
    );
  typia.assert(snapshots);
  // 4. Validate empty snapshot history
  TestValidator.equals("data array is empty", snapshots.data.length, 0);
  TestValidator.equals(
    "pagination records count is 0",
    snapshots.pagination.records,
    0,
  );
  TestValidator.predicate(
    "pagination pages is 0",
    snapshots.pagination.pages === 0,
  );
}