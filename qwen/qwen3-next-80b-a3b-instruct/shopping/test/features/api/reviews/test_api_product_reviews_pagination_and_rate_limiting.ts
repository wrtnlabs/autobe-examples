import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallReview";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReview";
import type { IShoppingMallSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSection";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { prepare_random_shopping_mall_section } from "../../../prepare/prepare_random_shopping_mall_section";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_review } from "../../../prepare/prepare_random_shopping_mall_review";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { generate_random_shopping_mall_customer_reviews_create } from "../../../generate/generate_random_shopping_mall_customer_reviews_create";
import { generate_random_shopping_mall_admin_categories_create } from "../../../generate/generate_random_shopping_mall_admin_categories_create";
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_product_reviews_pagination_and_rate_limiting(
  connection: api.IConnection,
) {
  // Step 1: Create admin connection and authorize
  const adminConnection: api.IConnection = { host: connection.host };
  const adminJoin = await authorize_admin_join(adminConnection, {
    body: {
      email: RandomGenerator.alphaNumeric(8) + "@wrtn.io",
      password: RandomGenerator.alphaNumeric(16),
      href: (RandomGenerator.alphaNumeric(10) + ".com/join") satisfies string &
        tags.Format<"uri">,
      referrer: (RandomGenerator.alphaNumeric(8) +
        ".com/referral") satisfies string & tags.Format<"uri">,
    } satisfies IShoppingMallAdmin.IJoin,
  });
  // Step 2: Create category
  const category = await generate_random_shopping_mall_admin_categories_create(
    adminConnection,
    {
      body: {
        name: RandomGenerator.name(),
      } satisfies IShoppingMallSection.ICreate,
    },
  );
  // Step 3: Create seller connection and authorize
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerJoin = await authorize_seller_join(sellerConnection, {
    body: {
      email: RandomGenerator.alphaNumeric(8) + "@example.io",
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IShoppingMallSeller.IJoin,
  });
  // Step 4: Create product
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        category_id: category.categoryId,
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  const productId = (product as any).id; // Extract ID from response
  // Step 5: Create customer connection and authorize
  const customerConnection: api.IConnection = { host: connection.host };
  const customerJoin = await authorize_customer_join(customerConnection, {
    body: {
      email: RandomGenerator.alphaNumeric(8) + "@example.io",
      password: RandomGenerator.alphaNumeric(16),
      href: (RandomGenerator.alphaNumeric(10) + ".com/join") satisfies string &
        tags.Format<"uri">,
      referrer: (RandomGenerator.alphaNumeric(8) +
        ".com/referral") satisfies string & tags.Format<"uri">,
    } satisfies IShoppingMallCustomer.IJoin,
  });
  // Step 6: Create 25 reviews for pagination
  const reviewPromises = ArrayUtil.repeat(25, async () => {
    const review = await generate_random_shopping_mall_customer_reviews_create(
      customerConnection,
      {
        body: {
          rating: RandomGenerator.pick([1, 2, 3, 4, 5] as const),
          text: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IShoppingMallReview.ICreate,
      },
    );
    return review;
  });
  const reviews = await Promise.all(reviewPromises);
  // Step 7: Create 26th review to test continuation token
  const twentySixthReview =
    await generate_random_shopping_mall_customer_reviews_create(
      customerConnection,
      {
        body: {
          rating: RandomGenerator.pick([1, 2, 3, 4, 5] as const),
          text: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IShoppingMallReview.ICreate,
      },
    );
  const twentySixthReviewId = (twentySixthReview as any).id; // Extract ID from response
  // Step 8: Validate pagination with limit=25
  const firstPage = await api.functional.shoppingMall.customer.reviews.index(
    customerConnection,
    {
      body: {
        product_id: productId,
        limit: 25,
      } satisfies IShoppingMallReview,
    },
  );
  typia.assert(firstPage);
  TestValidator.equals(
    "first page has 25 items",
    firstPage.pagination.limit,
    25,
  );
  TestValidator.equals("first page has 25 reviews", firstPage.data.length, 25);
  TestValidator.equals(
    "first page has 26 total reviews",
    firstPage.pagination.records,
    26,
  );
  TestValidator.equals(
    "first page current is 1",
    firstPage.pagination.current,
    1,
  );
  TestValidator.equals("first page has 2 pages", firstPage.pagination.pages, 2);
  // Step 9: Validate second page with continuation token
  // Extract review IDs for pagination
  const reviewIds = reviews.map((r) => (r as any).id);
  let nextToken = null;
  if ("next_token" in firstPage) {
    nextToken = (firstPage as any).next_token;
  }
  // If no next_token is available, we'll use a different approach
  // We'll use the last created review's ID as continuation token
  // Based on the API specification for a cursor-based pagination system
  if (!nextToken && reviewIds.length > 0) {
    nextToken = reviewIds[reviewIds.length - 1];
  }
  const secondPage = await api.functional.shoppingMall.customer.reviews.index(
    customerConnection,
    {
      body: {
        product_id: productId,
        limit: 25,
        token: nextToken,
      } satisfies IShoppingMallReview,
    },
  );
  typia.assert(secondPage);
  TestValidator.equals("second page has 1 item", secondPage.data.length, 1);
  TestValidator.equals(
    "second page has 26 total reviews",
    secondPage.pagination.records,
    26,
  );
  TestValidator.equals(
    "second page current is 2",
    secondPage.pagination.current,
    2,
  );
  TestValidator.equals(
    "second page has 2 pages",
    secondPage.pagination.pages,
    2,
  );
  TestValidator.equals(
    "second page contains 26th review",
    (secondPage.data[0] as any).id,
    twentySixthReviewId,
  );
  // Step 10: Test rate limiting by sending 51 requests
  // The API document states there's a rate limit of 50 requests per minute
  const rateLimitRequests = ArrayUtil.repeat(51, async () => {
    return api.functional.shoppingMall.customer.reviews.index(
      customerConnection,
      {
        body: {
          product_id: productId,
          limit: 5,
        } satisfies IShoppingMallReview,
      },
    );
  });
  // Wait for all requests and collect results
  const results = await Promise.allSettled(rateLimitRequests);
  // Count successful and failed requests
  const successfulRequests = results.filter(
    (r) => r.status === "fulfilled",
  ).length;
  const failedRequests = results.filter((r) => r.status === "rejected").length;
  // Verify we have exactly 50 successful and 1 failed (rate limited)
  TestValidator.equals(
    "exactly 50 successful requests",
    successfulRequests,
    50,
  );
  TestValidator.equals(
    "exactly 1 failed request (rate limited)",
    failedRequests,
    1,
  );
  // Verify the failed request is an HttpError with status 429
  const failedResult = results.find((r) => r.status === "rejected");
  if (failedResult && failedResult.reason instanceof TypeError) {
    throw new Error("Failed request is not an HttpError");
  }
  if (failedResult && failedResult.reason && "status" in failedResult.reason) {
    const error = failedResult.reason as any;
    typia.assert<{
      status: number;
    }>(error);
    TestValidator.equals("rate limit error status is 429", error.status, 429);
  } else if (
    failedResult &&
    failedResult.reason &&
    failedResult.reason instanceof Error
  ) {
    // Try to find status property in the error object
    if ("status" in failedResult.reason) {
      const error = failedResult.reason as any;
      TestValidator.equals("rate limit error status is 429", error.status, 429);
    } else {
      throw new Error("Failed request is not an HttpError with status 429");
    }
  } else {
    throw new Error("Failed request is not an HttpError with status 429");
  }
}
