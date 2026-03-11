import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
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

/**
 * Test filtering product reviews by productId to view all reviews for a specific product.
 * This test validates the public-facing review filtering functionality.
 */
export async function test_api_customer_review_list_product_filter(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create customer account and authenticate
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>() satisfies string as string,
      password: "1234test",
      href: "http://test.example.com/join",
      referrer: "http://test.example.com/",
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  typia.assert(customer);
  // Generate a test productId (UUID format)
  const testProductId = typia.random<string & tags.Format<"uuid">>();
  // 2. Fetch reviews filtered by productId
  const reviews = await api.functional.ecommerceMall.customer.reviews.index(
    customerConnection,
    {
      body: {
        productId: testProductId,
        page: 1,
        pageSize: 20,
        isActive: true,
      } satisfies IEcommerceMallReview.IRequest,
    },
  );
  typia.assert(reviews);
  // 3. Validate response structure
  TestValidator.equals(
    "pagination current page",
    reviews.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit", reviews.pagination.limit, 20);
  TestValidator.predicate(
    "pagination records non-negative",
    reviews.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages calculated",
    reviews.pagination.pages ===
      (reviews.pagination.records === 0
        ? 0
        : Math.ceil(reviews.pagination.records / 20)),
  );
  // 4. Validate all reviews match filtered productId
  if (reviews.data.length > 0) {
    for (const review of reviews.data) {
      typia.assert(review);
      TestValidator.equals(
        "review product ID matches filter",
        review.product.id,
        testProductId,
      );
      TestValidator.predicate(
        "customer display name exists",
        review.customer.display_name.length > 0,
      );
      TestValidator.predicate(
        "rating within valid range (1-5)",
        review.rating >= 1 && review.rating <= 5,
      );
      TestValidator.equals("review is active", review.is_active, true);
    }
  } else {
    TestValidator.equals(
      "empty product has zero records",
      reviews.pagination.records,
      0,
    );
  }
  // 5. Test pagination with different page size
  const reviewsWithLimit =
    await api.functional.ecommerceMall.customer.reviews.index(
      customerConnection,
      {
        body: {
          productId: testProductId,
          page: 1,
          pageSize: 100,
          isActive: true,
        } satisfies IEcommerceMallReview.IRequest,
      },
    );
  typia.assert(reviewsWithLimit);
  TestValidator.equals(
    "pagination limit updated",
    reviewsWithLimit.pagination.limit,
    100,
  );
}