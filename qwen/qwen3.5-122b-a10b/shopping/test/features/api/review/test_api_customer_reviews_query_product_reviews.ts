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

export async function test_api_customer_reviews_query_product_reviews(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate customer
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: null,
      phone_number: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: null,
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  typia.assert(customer);
  // 2. Query reviews with productId filter (using a random UUID - will return empty)
  const productId = typia.random<string & tags.Format<"uuid">>();
  const productReviews =
    await api.functional.ecommerceMall.customer.reviews.index(
      customerConnection,
      {
        body: {
          productId,
          page: 1,
          pageSize: 20,
          isDeleted: false,
        } satisfies IEcommerceMallReview.IRequest,
      },
    );
  typia.assert(productReviews);
  // 3. Validate empty result for non-existent product
  TestValidator.equals(
    "empty product review set",
    productReviews.pagination.records,
    0,
  );
  TestValidator.equals("pagination pages", productReviews.pagination.pages, 0);
  TestValidator.equals("data array length", productReviews.data.length, 0);
  // 4. Test pagination parameters
  const paginatedReviews =
    await api.functional.ecommerceMall.customer.reviews.index(
      customerConnection,
      {
        body: {
          productId,
          page: 1,
          pageSize: 10,
        } satisfies IEcommerceMallReview.IRequest,
      },
    );
  typia.assert(paginatedReviews);
  TestValidator.equals(
    "custom page size limit",
    paginatedReviews.pagination.limit,
    10,
  );
  // 5. Test rating filter (will return empty but validates filter works)
  const ratingFilteredReviews =
    await api.functional.ecommerceMall.customer.reviews.index(
      customerConnection,
      {
        body: {
          productId,
          rating: 5,
          isDeleted: false,
        } satisfies IEcommerceMallReview.IRequest,
      },
    );
  typia.assert(ratingFilteredReviews);
  TestValidator.equals(
    "rating filtered empty set",
    ratingFilteredReviews.pagination.records,
    0,
  );
  // 6. Test isDeleted filter explicitly
  const deletedFilterReviews =
    await api.functional.ecommerceMall.customer.reviews.index(
      customerConnection,
      {
        body: {
          productId,
          isDeleted: true,
        } satisfies IEcommerceMallReview.IRequest,
      },
    );
  typia.assert(deletedFilterReviews);
  // 7. Test sorting by created_at DESC (default)
  const sortedReviews =
    await api.functional.ecommerceMall.customer.reviews.index(
      customerConnection,
      {
        body: {
          productId,
          sortBy: "created_at",
          sortOrder: "desc",
        } satisfies IEcommerceMallReview.IRequest,
      },
    );
  typia.assert(sortedReviews);
  // 8. Test sorting by rating
  const ratingSortedReviews =
    await api.functional.ecommerceMall.customer.reviews.index(
      customerConnection,
      {
        body: {
          productId,
          sortBy: "rating",
          sortOrder: "desc",
        } satisfies IEcommerceMallReview.IRequest,
      },
    );
  typia.assert(ratingSortedReviews);
  // 9. Test with different page numbers
  const page2Reviews =
    await api.functional.ecommerceMall.customer.reviews.index(
      customerConnection,
      {
        body: {
          productId,
          page: 2,
          pageSize: 20,
        } satisfies IEcommerceMallReview.IRequest,
      },
    );
  typia.assert(page2Reviews);
  TestValidator.equals("page 2 current", page2Reviews.pagination.current, 2);
  // 10. Test ascending sort order
  const ascendingReviews =
    await api.functional.ecommerceMall.customer.reviews.index(
      customerConnection,
      {
        body: {
          productId,
          sortBy: "created_at",
          sortOrder: "asc",
        } satisfies IEcommerceMallReview.IRequest,
      },
    );
  typia.assert(ascendingReviews);
}
