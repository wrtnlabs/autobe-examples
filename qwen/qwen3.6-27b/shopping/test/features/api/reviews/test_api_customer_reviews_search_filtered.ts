import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommercePlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCategory";
import type { IEcommercePlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCustomer";
import type { IEcommercePlatformCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCustomerProfile";
import type { IEcommercePlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProduct";
import type { IEcommercePlatformReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformReview";
import type { IEcommercePlatformSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSellerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommercePlatformReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommercePlatformReview";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_reviews_search_filtered(
  connection: api.IConnection,
) {
  // 1. Authenticate as customer
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommercePlatformCustomer.IJoin,
  });
  // 2. Define date range (roughly 1 month ago to now)
  const now = new Date();
  const fromDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const createdAtFrom = fromDate.toISOString();
  const createdAtTo = now.toISOString();
  // 3. First search request with multiple filters
  const searchKeyword = "the";
  const firstRequest = {
    minRating: 4,
    maxRating: 5,
    createdAtFrom,
    createdAtTo,
    search: searchKeyword,
    limit: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
    >() satisfies number as number,
    page: 1 satisfies number as number,
  } satisfies IEcommercePlatformReview.IRequest;
  const firstResult =
    await api.functional.ecommercePlatform.customer.reviews.index(
      customerConnection,
      { body: firstRequest },
    );
  typia.assert(firstResult);
  // 4. Validate pagination metadata
  const pagination = firstResult.pagination;
  TestValidator.predicate(
    "pagination has valid current page",
    pagination.current >= 1,
  );
  TestValidator.equals(
    "pagination limit matches request",
    pagination.limit,
    firstRequest.limit ?? 20,
  );
  TestValidator.predicate(
    "records count is non-negative",
    pagination.records >= 0,
  );
  TestValidator.predicate("pages count is non-negative", pagination.pages >= 0);
  // 5. Validate each review matches filter criteria
  const data = firstResult.data;
  for (const review of data) {
    TestValidator.predicate(
      `review ${review.id} rating >= minRating (4)`,
      review.rating >= 4,
    );
    TestValidator.predicate(
      `review ${review.id} rating <= maxRating (5)`,
      review.rating <= 5,
    );
    TestValidator.predicate(
      `review ${review.id} created_at >= createdAtFrom`,
      review.created_at >= createdAtFrom,
    );
    TestValidator.predicate(
      `review ${review.id} created_at <= createdAtTo`,
      review.created_at <= createdAtTo,
    );
    if (review.text_content !== null) {
      TestValidator.predicate(
        `review ${review.id} text contains keyword`,
        review.text_content.includes(searchKeyword),
      );
    }
  }
  // 6. Second search request with page=2 to verify pagination consistency
  const secondRequest = {
    ...firstRequest,
    page: 2 satisfies number as number,
  } satisfies IEcommercePlatformReview.IRequest;
  const secondResult =
    await api.functional.ecommercePlatform.customer.reviews.index(
      customerConnection,
      { body: secondRequest },
    );
  typia.assert(secondResult);
  // 7. Validate pagination metadata of second page
  const secondPagination = secondResult.pagination;
  TestValidator.equals("second request page", secondPagination.current, 2);
  TestValidator.predicate(
    "second page records non-negative",
    secondPagination.records >= 0,
  );
  TestValidator.predicate(
    "second page limit valid",
    secondPagination.limit >= 1,
  );
  // 8. Second page reviews also match filter criteria
  for (const review of secondResult.data) {
    TestValidator.predicate(
      `second page review ${review.id} rating in range`,
      review.rating >= 4 && review.rating <= 5,
    );
    TestValidator.predicate(
      `second page review ${review.id} in date range`,
      review.created_at >= createdAtFrom && review.created_at <= createdAtTo,
    );
  }
}
