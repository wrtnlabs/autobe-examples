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
export async function test_api_review_snapshots_retrieval_by_author(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a new customer connection and authenticate
  const customerConnection: api.IConnection = { host: connection.host };
  const customer: IShoppingMallCustomer.IAuthorized =
    await authorize_customer_join(customerConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: "https://example.com/join",
        referrer: "https://example.com/referral",
      } satisfies IShoppingMallCustomer.IJoin,
    });
  typia.assert(customer);
  // Step 2: Create a product review to generate snapshots
  const review: IShoppingMallReview =
    await generate_random_shopping_mall_customer_reviews_create(
      customerConnection,
      {
        body: {
          rating: 5,
          text: "Excellent product!",
        } satisfies IShoppingMallReview.ICreate,
      },
    );
  typia.assert(review);
  // Step 3: Modify the review to create additional snapshots
  // Edit the review text
  const updatedReview: IShoppingMallReview =
    await api.functional.shoppingMall.customer.reviews.create(
      customerConnection,
      {
        body: {
          rating: 5,
          text: "Excellent product! Highly recommend.",
        } satisfies IShoppingMallReview.ICreate,
      },
    );
  typia.assert(updatedReview);
  // Step 4: Retrieve snapshots for the review
  const snapshotsPage: IPageIShoppingMallReviewSnapshot =
    await api.functional.shoppingMall.customer.reviews.snapshots.at(
      customerConnection,
      {
        reviewId: typia.assert<string>((review as any).id),
      },
    );
  typia.assert(snapshotsPage);
  // Step 5: Validate the snapshots
  // Ensure we have at least 2 snapshots (original + edit)
  TestValidator.predicate(
    "at least two snapshots exist",
    snapshotsPage.data.length >= 2,
  );
  // Validate the order is chronological
  for (let i = 0; i < snapshotsPage.data.length - 1; i++) {
    const currentSnapshot = snapshotsPage.data[i];
    const nextSnapshot = snapshotsPage.data[i + 1];
    TestValidator.predicate(
      "snapshots are in chronological order",
      Date.parse((currentSnapshot as any).createdAt) <=
        Date.parse((nextSnapshot as any).createdAt),
    );
  }
  // Validate snapshot content
  const firstSnapshot = snapshotsPage.data[0];
  TestValidator.equals(
    "first snapshot rating is original rating",
    (firstSnapshot as any).originalRating,
    5,
  );
  TestValidator.equals(
    "first snapshot text is original text",
    (firstSnapshot as any).originalText,
    "Excellent product!",
  );
  TestValidator.equals(
    "first snapshot is not deleted",
    (firstSnapshot as any).isDeleted,
    false,
  );
  TestValidator.equals(
    "first snapshot actor type is user",
    (firstSnapshot as any).actorType,
    "user",
  );
  const lastSnapshot = snapshotsPage.data[snapshotsPage.data.length - 1];
  TestValidator.equals(
    "last snapshot rating is updated rating",
    (lastSnapshot as any).editedRating,
    5,
  );
  TestValidator.equals(
    "last snapshot text is updated text",
    (lastSnapshot as any).editedText,
    "Excellent product! Highly recommend.",
  );
  TestValidator.equals(
    "last snapshot is not deleted",
    (lastSnapshot as any).isDeleted,
    false,
  );
  TestValidator.equals(
    "last snapshot actor type is user",
    (lastSnapshot as any).actorType,
    "user",
  );
  // Step 6: Test with non-existent reviewId (should return empty array)
  const emptyPage: IPageIShoppingMallReviewSnapshot =
    await api.functional.shoppingMall.customer.reviews.snapshots.at(
      customerConnection,
      {
        reviewId: "00000000-0000-0000-0000-000000000000",
      },
    );
  typia.assert(emptyPage);
  TestValidator.equals(
    "non-existent reviewId returns empty array",
    emptyPage.data.length,
    0,
  );
  TestValidator.equals(
    "non-existent reviewId pagination is correct",
    emptyPage.pagination.current,
    1,
  );
  TestValidator.equals(
    "non-existent reviewId pagination is correct",
    emptyPage.pagination.limit,
    100,
  );
  TestValidator.equals(
    "non-existent reviewId pagination is correct",
    emptyPage.pagination.records,
    0,
  );
  TestValidator.equals(
    "non-existent reviewId pagination is correct",
    emptyPage.pagination.pages,
    0,
  );
}