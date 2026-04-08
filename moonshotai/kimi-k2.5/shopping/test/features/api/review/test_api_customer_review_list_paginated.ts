import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReview";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
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
import { generate_random_ecommerce_mall_customer_reviews_create } from "../../../generate/generate_random_ecommerce_mall_customer_reviews_create";
import { prepare_random_ecommerce_mall_review } from "../../../prepare/prepare_random_ecommerce_mall_review";

export async function test_api_customer_review_list_paginated(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create authenticated customer connection
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {});
  // 2. Create a review to ensure test data exists
  const review = await generate_random_ecommerce_mall_customer_reviews_create(
    customerConnection,
    {},
  );
  typia.assert(review);
  // 3. Fetch reviews with default pagination
  const defaultPage =
    await api.functional.ecommerceMall.customer.customer.reviews.index(
      customerConnection,
      {
        body: {
          productId: null,
          customerId: null,
          minRating: null,
          maxRating: null,
          createdAfter: null,
          createdBefore: null,
          search: null,
          sort: "newest",
          includeDeleted: null,
          page: null,
          limit: null,
        } satisfies IEcommerceMallReview.IRequest,
      },
    );
  typia.assert(defaultPage);
  // 4. Validate pagination response structure
  TestValidator.predicate(
    "pagination has valid current page",
    defaultPage.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination has valid limit",
    defaultPage.pagination.limit >= 1,
  );
  TestValidator.predicate(
    "pagination has valid records count",
    defaultPage.pagination.records >= 1,
  );
  TestValidator.predicate(
    "data array length matches expected",
    defaultPage.data.length >= 1,
  );
  // 5. Test with explicit pagination parameters
  const customPage =
    await api.functional.ecommerceMall.customer.customer.reviews.index(
      customerConnection,
      {
        body: {
          productId: null,
          customerId: null,
          minRating: null,
          maxRating: null,
          createdAfter: null,
          createdBefore: null,
          search: null,
          sort: "newest",
          includeDeleted: null,
          page: 1,
          limit: 10,
        } satisfies IEcommerceMallReview.IRequest,
      },
    );
  typia.assert(customPage);
  TestValidator.equals(
    "page matches request",
    customPage.pagination.current,
    1,
  );
  TestValidator.equals(
    "limit matches request",
    customPage.pagination.limit,
    10,
  );
  // 6. Test sorting by highest rating
  const highestRatingPage =
    await api.functional.ecommerceMall.customer.customer.reviews.index(
      customerConnection,
      {
        body: {
          productId: null,
          customerId: null,
          minRating: null,
          maxRating: null,
          createdAfter: null,
          createdBefore: null,
          search: null,
          sort: "highestRating",
          includeDeleted: null,
          page: 1,
          limit: 10,
        } satisfies IEcommerceMallReview.IRequest,
      },
    );
  typia.assert(highestRatingPage);
  // 7. Test sorting by oldest first
  const oldestPage =
    await api.functional.ecommerceMall.customer.customer.reviews.index(
      customerConnection,
      {
        body: {
          productId: null,
          customerId: null,
          minRating: null,
          maxRating: null,
          createdAfter: null,
          createdBefore: null,
          search: null,
          sort: "oldest",
          includeDeleted: null,
          page: 1,
          limit: 10,
        } satisfies IEcommerceMallReview.IRequest,
      },
    );
  typia.assert(oldestPage);
  // 8. Test filtering by rating range
  const ratingFilteredPage =
    await api.functional.ecommerceMall.customer.customer.reviews.index(
      customerConnection,
      {
        body: {
          productId: null,
          customerId: null,
          minRating: 1,
          maxRating: 5,
          createdAfter: null,
          createdBefore: null,
          search: null,
          sort: "newest",
          includeDeleted: null,
          page: 1,
          limit: 10,
        } satisfies IEcommerceMallReview.IRequest,
      },
    );
  typia.assert(ratingFilteredPage);
}
