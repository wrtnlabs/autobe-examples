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

export async function test_api_customer_reviews_search_filtered_by_verified_purchase(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer authentication
  const customerConnection: api.IConnection = { host: connection.host };
  const customer: IEcommerceMallCustomer.IAuthorized =
    await authorize_customer_join(customerConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      },
    });
  typia.assert(customer);
  // 2. Search with is_verified_purchase=true (get verified reviews)
  const verifiedReviews: IPageIEcommerceMallReview.ISummary =
    await api.functional.ecommerceMall.customer.reviews.search.index(
      customerConnection,
      {
        body: {
          is_verified_purchase: true,
          page: 1,
          limit: 10,
        } satisfies IEcommerceMallReview.IRequest,
      },
    );
  typia.assert(verifiedReviews);
  // 3. Search with is_verified_purchase=false (get non-verified reviews)
  const nonVerifiedReviews: IPageIEcommerceMallReview.ISummary =
    await api.functional.ecommerceMall.customer.reviews.search.index(
      customerConnection,
      {
        body: {
          is_verified_purchase: false,
          page: 1,
          limit: 10,
        } satisfies IEcommerceMallReview.IRequest,
      },
    );
  typia.assert(nonVerifiedReviews);
  // 4. Combined filters: verified purchase + rating range
  const highRatedVerifiedReviews: IPageIEcommerceMallReview.ISummary =
    await api.functional.ecommerceMall.customer.reviews.search.index(
      customerConnection,
      {
        body: {
          is_verified_purchase: true,
          min_rating: 4 as number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<5>,
          max_rating: 5 as number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<5>,
          sort_by: "rating",
          direction: "desc",
          page: 1,
          limit: 10,
        } satisfies IEcommerceMallReview.IRequest,
      },
    );
  typia.assert(highRatedVerifiedReviews);
  // 5. Validate pagination structure
  TestValidator.predicate(
    "pagination exists",
    highRatedVerifiedReviews.pagination !== undefined,
  );
  TestValidator.predicate(
    "data array exists",
    Array.isArray(highRatedVerifiedReviews.data),
  );
  TestValidator.equals(
    "pagination records valid",
    0,
    highRatedVerifiedReviews.pagination.records as number,
  );
  TestValidator.equals(
    "pagination limit valid",
    1,
    highRatedVerifiedReviews.pagination.limit as number,
  );
  // 6. Validate review items have is_verified_purchase field
  if (highRatedVerifiedReviews.data.length > 0) {
    highRatedVerifiedReviews.data.forEach((review, index) => {
      TestValidator.predicate(
        `review ${index} has is_verified_purchase boolean`,
        typeof review.is_verified_purchase === "boolean",
      );
      TestValidator.equals(
        `review ${index} has is_verified_purchase=true`,
        review.is_verified_purchase,
        true,
      );
    });
  }
  // 7. Search without any filters to get baseline data
  const allReviews: IPageIEcommerceMallReview.ISummary =
    await api.functional.ecommerceMall.customer.reviews.search.index(
      customerConnection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies IEcommerceMallReview.IRequest,
      },
    );
  typia.assert(allReviews);
  // 8. Verify response structure consistency across different filter combinations
  TestValidator.equals(
    "data arrays consistent type",
    Array.isArray(verifiedReviews.data),
    Array.isArray(allReviews.data),
  );
  TestValidator.equals(
    "pagination objects consistent type",
    typeof verifiedReviews.pagination,
    typeof allReviews.pagination,
  );
}