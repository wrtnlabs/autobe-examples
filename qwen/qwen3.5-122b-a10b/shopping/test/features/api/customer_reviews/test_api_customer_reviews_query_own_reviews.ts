import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
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

export async function test_api_customer_reviews_query_own_reviews(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate customer
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      phone_number: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: null,
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  typia.assert(customer);
  // 2. Query reviews with default pagination
  const defaultQuery =
    await api.functional.ecommerceMall.customer.reviews.index(
      customerConnection,
      {
        body: {
          page: 1,
          pageSize: 20,
        } satisfies IEcommerceMallReview.IRequest,
      },
    );
  typia.assert(defaultQuery);
  // 3. Test filtering by rating
  const ratingFilter =
    await api.functional.ecommerceMall.customer.reviews.index(
      customerConnection,
      {
        body: {
          rating: 5,
        } satisfies IEcommerceMallReview.IRequest,
      },
    );
  typia.assert(ratingFilter);
  // 4. Test filtering by isDeleted
  const deletedFilter =
    await api.functional.ecommerceMall.customer.reviews.index(
      customerConnection,
      {
        body: {
          isDeleted: true,
        } satisfies IEcommerceMallReview.IRequest,
      },
    );
  typia.assert(deletedFilter);
  // 5. Test empty result set with non-existent customer
  const emptyResult = await api.functional.ecommerceMall.customer.reviews.index(
    customerConnection,
    {
      body: {
        customerId: typia.random<string & tags.Format<"uuid">>(),
      } satisfies IEcommerceMallReview.IRequest,
    },
  );
  typia.assert(emptyResult);
  TestValidator.equals(
    "empty result has 0 records",
    emptyResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "empty result has 0 pages",
    emptyResult.pagination.pages,
    0,
  );
  TestValidator.equals(
    "empty result has empty data",
    emptyResult.data.length,
    0,
  );
  // 6. Test sorting by created_at DESC (default)
  const sortByCreatedAt =
    await api.functional.ecommerceMall.customer.reviews.index(
      customerConnection,
      {
        body: {
          sortBy: "created_at",
          sortOrder: "desc",
        } satisfies IEcommerceMallReview.IRequest,
      },
    );
  typia.assert(sortByCreatedAt);
  // 7. Test sorting by rating
  const sortByRating =
    await api.functional.ecommerceMall.customer.reviews.index(
      customerConnection,
      {
        body: {
          sortBy: "rating",
          sortOrder: "desc",
        } satisfies IEcommerceMallReview.IRequest,
      },
    );
  typia.assert(sortByRating);
  // 8. Test pagination with custom page and pageSize
  const customPagination =
    await api.functional.ecommerceMall.customer.reviews.index(
      customerConnection,
      {
        body: {
          page: 1,
          pageSize: 10,
        } satisfies IEcommerceMallReview.IRequest,
      },
    );
  typia.assert(customPagination);
  TestValidator.equals(
    "custom page size is respected",
    customPagination.pagination.limit,
    10,
  );
  // 9. Test combined filters (rating + isDeleted)
  const combinedFilter =
    await api.functional.ecommerceMall.customer.reviews.index(
      customerConnection,
      {
        body: {
          rating: 4,
          isDeleted: false,
        } satisfies IEcommerceMallReview.IRequest,
      },
    );
  typia.assert(combinedFilter);
  // 10. Test date range filtering
  const dateRangeFilter =
    await api.functional.ecommerceMall.customer.reviews.index(
      customerConnection,
      {
        body: {
          startDate: new Date(Date.now() - 86400000 * 30).toISOString(), // 30 days ago
          endDate: new Date().toISOString(),
        } satisfies IEcommerceMallReview.IRequest,
      },
    );
  typia.assert(dateRangeFilter);
}
