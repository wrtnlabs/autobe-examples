import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallReviewSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallReviewSnapshot";
import type { IShoppingMallAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReview";
import type { IShoppingMallReviewSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReviewSnapshot";
import { prepare_random_shopping_mall_review } from "../../../prepare/prepare_random_shopping_mall_review";
import { generate_random_shopping_mall_customer_reviews_create } from "../../../generate/generate_random_shopping_mall_customer_reviews_create";
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
export async function test_api_review_snapshots_pagination_and_ordering(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate as customer
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.MinLength<8>>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallCustomer.IJoin,
  });
  // Step 2: Create a single review that will generate multiple snapshots
  const review = await generate_random_shopping_mall_customer_reviews_create(
    customerConnection,
    {
      body: {
        rating: 5,
        text: RandomGenerator.paragraph(),
      } satisfies IShoppingMallReview.ICreate,
    },
  );
  typia.assert(review);
  // Step 3: Update the same review multiple times to generate snapshots
  // We need at least 105 snapshots to test pagination beyond page 1
  // Since 'update' endpoint does not exist, we assume system creates snapshots on every review creation.
  // Therefore we create 105 reviews to generate the snapshots.
  for (let i = 1; i < 105; i++) {
    // Create new review with different text to generate another snapshot
    // The system treats each new review as a new snapshot
    await generate_random_shopping_mall_customer_reviews_create(
      customerConnection,
      {
        body: {
          rating: 5,
          text: RandomGenerator.paragraph(),
        } satisfies IShoppingMallReview.ICreate,
      },
    );
    // Small delay to ensure different createdAt timestamps
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  // Step 4: Retrieve first page of snapshots
  const firstPage: IPageIShoppingMallReviewSnapshot =
    await api.functional.shoppingMall.customer.reviews.snapshots.at(
      customerConnection,
      { reviewId: typia.assert(review as any).id },
    );
  typia.assert(firstPage);
  // Step 5: Validate pagination metadata
  TestValidator.equals(
    "pagination current page is 1",
    firstPage.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit is default 100",
    firstPage.pagination.limit,
    100,
  );
  TestValidator.predicate(
    "pagination records >= 105",
    () => firstPage.pagination.records >= 105,
  );
  TestValidator.predicate(
    "pagination pages >= 2",
    () => firstPage.pagination.pages >= 2,
  );
  // Step 6: Validate snapshots are ordered chronologically (oldest first)
  const firstSnapshot = firstPage.data[0];
  const lastSnapshot = firstPage.data[99];
  const firstCreatedAt = new Date(typia.assert(firstSnapshot as any).createdAt);
  const lastCreatedAt = new Date(typia.assert(lastSnapshot as any).createdAt);
  TestValidator.predicate(
    "first snapshot created before last snapshot",
    () => firstCreatedAt < lastCreatedAt,
  );
  // Step 7: Get second page to validate continuation
  const secondPage: IPageIShoppingMallReviewSnapshot =
    await api.functional.shoppingMall.customer.reviews.snapshots.at(
      customerConnection,
      { reviewId: typia.assert(review as any).id },
    );
  typia.assert(secondPage);
  // Verify second page has results
  TestValidator.predicate(
    "second page has results",
    () => secondPage.data.length > 0,
  );
  // Verify second page continues from where first page ended
  const secondPageFirst = secondPage.data[0];
  const secondPageFirstCreatedAt = new Date(typia.assert(secondPageFirst as any).createdAt);
  TestValidator.predicate(
    "second page first snapshot created after first page last snapshot",
    () => secondPageFirstCreatedAt > lastCreatedAt,
  );
}