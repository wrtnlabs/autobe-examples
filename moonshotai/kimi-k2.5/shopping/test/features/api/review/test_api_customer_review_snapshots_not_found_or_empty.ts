import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReview";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallReview";
import { prepare_random_ecommerce_mall_review } from "../../../prepare/prepare_random_ecommerce_mall_review";
import { generate_random_ecommerce_mall_customer_reviews_create } from "../../../generate/generate_random_ecommerce_mall_customer_reviews_create";
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_review_snapshots_not_found_or_empty(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create actor-specific connection for customer
  const customerConnection: api.IConnection = { host: connection.host };

  // 2. Authenticate as customer
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });

  // 3. Generate a random non-existent review ID for the 404 test
  const nonExistentReviewId = typia.random<string & tags.Format<"uuid">>();

  // Case A: Test 404 Not Found for non-existent review
  await TestValidator.error(
    "should throw 404 for non-existent review",
    async () => {
      await api.functional.ecommerceMall.customer.reviews.snapshots.index(
        customerConnection,
        {
          reviewId: nonExistentReviewId,
          body: {} satisfies IEcommerceMallReview.ISnapshotRequest,
        },
      );
    },
  );

  // 4. Create a review (newly created reviews have no edit history/snapshots)
  const review = await generate_random_ecommerce_mall_customer_reviews_create(
    customerConnection,
    {},
  );
  typia.assert(review);

  // Case B: Test empty pagination for review with no edit history
  const emptySnapshots =
    await api.functional.ecommerceMall.customer.reviews.snapshots.index(
      customerConnection,
      {
        reviewId: review.id,
        body: {} satisfies IEcommerceMallReview.ISnapshotRequest,
      },
    );
  typia.assert(emptySnapshots);

  // Validate empty pagination result
  TestValidator.equals("data array should be empty", emptySnapshots.data.length, 0);
  TestValidator.equals("records count should be 0", emptySnapshots.pagination.records, 0);
  TestValidator.equals("current page should be 1", emptySnapshots.pagination.current, 1);
  TestValidator.equals("pages count should be 0", emptySnapshots.pagination.pages, 0);
}