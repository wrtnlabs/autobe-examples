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
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_review } from "../../../prepare/prepare_random_shopping_mall_review";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { generate_random_shopping_mall_customer_reviews_create } from "../../../generate/generate_random_shopping_mall_customer_reviews_create";
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_admin_review_analytics_by_seller(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create connections for all required actors
  const adminConnection: api.IConnection = { host: connection.host };
  const sellerConnection: api.IConnection = { host: connection.host };
  const customerConnection: api.IConnection = { host: connection.host };
  // Step 2: Authenticate admin
  const adminCredentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    href: `https://${RandomGenerator.alphaNumeric(12)}.com`,
    referrer: `https://${RandomGenerator.alphaNumeric(10)}.com/referral`,
  } satisfies IShoppingMallAdmin.IJoin;
  await authorize_admin_join(adminConnection, { body: adminCredentials });
  // Step 3: Create seller account
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  await authorize_seller_join(sellerConnection, {
    body: {
      email: sellerEmail,
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IShoppingMallSeller.IJoin,
  });
  // Step 4: Create customer account to write reviews
  const customerEmail = typia.random<string & tags.Format<"email">>();
  await authorize_customer_join(customerConnection, {
    body: {
      email: customerEmail,
      password: RandomGenerator.alphaNumeric(16),
      href: `https://${RandomGenerator.alphaNumeric(12)}.com`,
      referrer: `https://${RandomGenerator.alphaNumeric(10)}.com/referral`,
    } satisfies IShoppingMallCustomer.IJoin,
  });
  // Step 5: Create two products under the seller's account
  const product1 = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {},
  );
  const product2 = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {},
  );
  // Step 6: Create reviews for product1 with ratings: 5, 4, 3
  // All reviews are valid and linked to product1
  await generate_random_shopping_mall_customer_reviews_create(
    customerConnection,
    {
      body: { rating: 5 } satisfies IShoppingMallReview.ICreate,
    },
  );
  await generate_random_shopping_mall_customer_reviews_create(
    customerConnection,
    {
      body: { rating: 4 } satisfies IShoppingMallReview.ICreate,
    },
  );
  await generate_random_shopping_mall_customer_reviews_create(
    customerConnection,
    {
      body: { rating: 3 } satisfies IShoppingMallReview.ICreate,
    },
  );
  // Step 7: Create reviews for product2 with ratings: 2, 1
  await generate_random_shopping_mall_customer_reviews_create(
    customerConnection,
    {
      body: { rating: 2 } satisfies IShoppingMallReview.ICreate,
    },
  );
  await generate_random_shopping_mall_customer_reviews_create(
    customerConnection,
    {
      body: { rating: 1 } satisfies IShoppingMallReview.ICreate,
    },
  );
  // Step 8: Call the analytics endpoint to get seller-level metrics
  const analyticsResult =
    await api.functional.shoppingMall.admin.reviews.metrics.analytics.index(
      adminConnection,
    );
  typia.assert(analyticsResult);
  // Step 9: Validate analytics results
  // We expect one seller in the results (the one we created)
  // Total review count: 5 (all reviews, no deletions)
  // Average rating: (5 + 4 + 3 + 2 + 1) / 5 = 3.0
  // Since analytics aggregation is grouped by seller, and we have only one seller,
  // verify the data array has exactly one element
  TestValidator.equals(
    "analytics should return exactly one seller record",
    analyticsResult.data.length,
    1,
  );
  const sellerAnalytics = analyticsResult.data[0];
  TestValidator.equals(
    "review count should be 5",
    sellerAnalytics.reviewCount,
    5,
  );
  TestValidator.equals(
    "average rating should be 3.0",
    sellerAnalytics.averageRating,
    3.0,
  );
}
