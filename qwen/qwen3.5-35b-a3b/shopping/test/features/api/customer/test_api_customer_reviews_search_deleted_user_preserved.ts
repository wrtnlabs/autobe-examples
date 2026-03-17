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

/**
 * Test that review search functionality works correctly with customer authentication.
 * Note: Original scenario for deleted customer preservation cannot be implemented
 * because customer deletion and review creation endpoints are not available.
 * This test validates the search endpoint with proper customer authentication.
 */
export async function test_api_customer_reviews_search_deleted_user_preserved(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create first customer account and authenticate
  const customer1Connection: api.IConnection = { host: connection.host };
  const customer1Result = await authorize_customer_join(customer1Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  typia.assert(customer1Result);
  // 2. Create second customer account
  const customer2Connection: api.IConnection = { host: connection.host };
  const customer2Result = await authorize_customer_join(customer2Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  typia.assert(customer2Result);
  // 3. First customer searches for reviews (authenticated)
  const searchResult =
    await api.functional.ecommerceMall.customer.reviews.search.index(
      customer1Connection,
      {
        body: {
          limit: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
          >(),
          page: 1,
        } satisfies IEcommerceMallReview.IRequest,
      },
    );
  typia.assert(searchResult);
  // 4. Validate search result structure
  TestValidator.equals(
    "pagination present",
    searchResult.pagination !== undefined,
    true,
  );
  TestValidator.equals(
    "data array exists",
    Array.isArray(searchResult.data),
    true,
  );
  TestValidator.equals(
    "pagination limit valid",
    searchResult.pagination.limit > 0,
    true,
  );
  TestValidator.equals(
    "pagination current valid",
    searchResult.pagination.current > 0,
    true,
  );
  // 5. If reviews exist, validate structure
  if (searchResult.data.length > 0) {
    const firstReview = searchResult.data[0];
    typia.assert(firstReview);
    // Validate review summary structure
    TestValidator.equals("review has id", firstReview.id !== undefined, true);
    TestValidator.equals(
      "review has customer",
      firstReview.customer !== undefined,
      true,
    );
    TestValidator.equals(
      "review has product",
      firstReview.product !== undefined,
      true,
    );
    TestValidator.equals(
      "review has rating",
      firstReview.rating >= 1 && firstReview.rating <= 5,
      true,
    );
    TestValidator.equals(
      "review has verification",
      typeof firstReview.is_verified_purchase === "boolean",
      true,
    );
    TestValidator.equals(
      "review has timestamp",
      firstReview.created_at !== undefined,
      true,
    );
    // Validate customer structure in review
    TestValidator.equals(
      "customer has id",
      firstReview.customer.id !== undefined,
      true,
    );
    TestValidator.equals(
      "customer has email",
      firstReview.customer.email !== undefined,
      true,
    );
    TestValidator.equals(
      "customer has status",
      firstReview.customer.status !== undefined,
      true,
    );
    TestValidator.equals(
      "customer has created_at",
      firstReview.customer.created_at !== undefined,
      true,
    );
    TestValidator.equals(
      "customer has deleted_at",
      firstReview.customer.deleted_at !== undefined,
      true,
    );
    // Validate product structure in review
    TestValidator.equals(
      "product has id",
      firstReview.product.id !== undefined,
      true,
    );
    TestValidator.equals(
      "product has name",
      firstReview.product.name !== undefined,
      true,
    );
    TestValidator.equals(
      "product has price",
      firstReview.product.base_price > 0,
      true,
    );
    TestValidator.equals(
      "product has slug",
      firstReview.product.slug !== undefined,
      true,
    );
    TestValidator.equals(
      "product has category",
      firstReview.product.category !== undefined,
      true,
    );
    // Validate category structure in product
    TestValidator.equals(
      "category has id",
      firstReview.product.category.id !== undefined,
      true,
    );
    TestValidator.equals(
      "category has name",
      firstReview.product.category.name !== undefined,
      true,
    );
  }
}