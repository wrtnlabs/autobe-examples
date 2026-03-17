import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReview";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallReview";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_reviews_search_by_product(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create customer account
  const customerConnection: api.IConnection = { host: connection.host };
  const customer: IEcommerceMallCustomer.IAuthorized =
    await authorize_customer_join(customerConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: "https://example.com/join",
        referrer: "https://example.com",
      } satisfies IEcommerceMallCustomer.IJoin,
    });
  typia.assert(customer);
  // 2. Search reviews for a specific product with pagination
  const searchConnection: api.IConnection = { host: connection.host };
  const productReviewResponse: IPageIEcommerceMallReview.ISummary =
    await api.functional.ecommerceMall.customer.reviews.search.index(
      searchConnection,
      {
        body: {
          product_id: "00000000-0000-0000-0000-000000000001",
          page: 1,
          limit: 10,
        } satisfies IEcommerceMallReview.IRequest,
      },
    );
  typia.assert(productReviewResponse);
  // 3. Validate pagination metadata
  TestValidator.equals(
    "pagination current",
    productReviewResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit",
    productReviewResponse.pagination.limit,
    10,
  );
  // 4. Test rating range filter
  const ratingFilteredResponse: IPageIEcommerceMallReview.ISummary =
    await api.functional.ecommerceMall.customer.reviews.search.index(
      searchConnection,
      {
        body: {
          product_id: "00000000-0000-0000-0000-000000000001",
          min_rating: 3,
          max_rating: 5,
          page: 1,
          limit: 20,
        } satisfies IEcommerceMallReview.IRequest,
      },
    );
  typia.assert(ratingFilteredResponse);
  // 5. Validate each review summary structure
  for (const review of ratingFilteredResponse.data) {
    typia.assert(review);
    // Validate review ID exists
    TestValidator.predicate("review has id", () => review.id !== undefined);
    // Validate customer object structure
    TestValidator.predicate(
      "customer has id",
      () => review.customer.id !== undefined,
    );
    TestValidator.predicate(
      "customer has email",
      () => review.customer.email !== undefined,
    );
    TestValidator.predicate(
      "customer has status",
      () => review.customer.status !== undefined,
    );
    TestValidator.predicate(
      "customer has created_at",
      () => review.customer.created_at !== undefined,
    );
    TestValidator.predicate(
      "customer deleted_at is null",
      () => review.customer.deleted_at === null,
    );
    // Validate product object exists
    TestValidator.predicate(
      "product exists",
      () => review.product !== undefined,
    );
    // Validate rating is 1-5
    TestValidator.predicate(
      "rating is number",
      () => typeof review.rating === "number",
    );
    TestValidator.predicate(
      "rating is between 1-5",
      () => review.rating >= 1 && review.rating <= 5,
    );
    // Validate is_verified_purchase is boolean
    TestValidator.predicate(
      "is_verified_purchase is boolean",
      () => typeof review.is_verified_purchase === "boolean",
    );
    // Validate helpfulness_vote_count is number
    TestValidator.predicate(
      "helpfulness_vote_count is number",
      () => typeof review.helpfulness_vote_count === "number",
    );
    // Validate timestamps exist
    TestValidator.predicate(
      "has created_at",
      () => review.created_at !== undefined,
    );
    TestValidator.predicate(
      "has updated_at",
      () => review.updated_at !== undefined,
    );
    TestValidator.predicate(
      "deleted_at is null",
      () => review.deleted_at === null,
    );
  }
}
