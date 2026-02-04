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
export async function test_api_admin_review_analytics_by_product(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(16);
  await authorize_admin_login(adminConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    },
  });
  // Step 2: Create a seller connection and authenticate
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = RandomGenerator.alphaNumeric(20);
  await authorize_seller_login(sellerConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
    },
  });
  // Step 3: Create customer connection and authenticate
  const customerConnection: api.IConnection = { host: connection.host };
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerPassword = RandomGenerator.alphaNumeric(16);
  await authorize_customer_login(customerConnection, {
    body: {
      email: customerEmail,
      password: customerPassword,
    },
  });
  // Step 4: Create a product
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: {},
    },
  );
  typia.assert(product);
  // Step 5: Create multiple reviews for testing - we'll use ratings 1, 2, 3, 4, 5
  // According to scenario: customer-deleted reviews (even ratings) should be INCLUDED
  // admin-deleted reviews (odd ratings) should be EXCLUDED
  // We'll create 5 reviews with these ratings
  await generate_random_shopping_mall_customer_reviews_create(
    customerConnection,
    {
      body: { rating: 1 }, // This will be admin-deleted, excluded from analytics
    },
  );
  await generate_random_shopping_mall_customer_reviews_create(
    customerConnection,
    {
      body: { rating: 2 }, // This will be customer-deleted, included in analytics
    },
  );
  await generate_random_shopping_mall_customer_reviews_create(
    customerConnection,
    {
      body: { rating: 3 }, // This will be admin-deleted, excluded from analytics
    },
  );
  await generate_random_shopping_mall_customer_reviews_create(
    customerConnection,
    {
      body: { rating: 4 }, // This will be customer-deleted, included in analytics
    },
  );
  await generate_random_shopping_mall_customer_reviews_create(
    customerConnection,
    {
      body: { rating: 5 }, // This will be admin-deleted, excluded from analytics
    },
  );
  // Step 6: Call the analytics endpoint
  const response =
    await api.functional.shoppingMall.admin.reviews.metrics.analytics.index(
      adminConnection,
    );
  typia.assert(response);
  // Validate pagination metadata
  TestValidator.equals(
    "pagination current page",
    response.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit", response.pagination.limit, 10);
  TestValidator.predicate(
    "pagination records > 0",
    response.pagination.records > 0,
  );
  TestValidator.equals(
    "pagination pages > 0",
    response.pagination.pages,
    (response.pagination.records + 9) / 10,
  );
  // Validate data structure
  TestValidator.predicate(
    "data array exists and has items",
    response.data.length > 0,
  );
  // Verify analytics contains exactly one element with platform-wide metrics
  const analytics = response.data[0];
  // The average rating should be based on customer-deleted reviews (even ratings: 2, 4)
  // Admin-deleted reviews (odd ratings: 1, 3, 5) are excluded
  // Average = (2 + 4) / 2 = 3.0
  TestValidator.equals("platform average rating", analytics.averageRating, 3.0);
  // Review count should be 2 (for ratings 2 and 4)
  TestValidator.equals("platform review count", analytics.reviewCount, 2);
  // Ensure the platform analytics has no other fields or structure beyond IShoppingMallReview.ISummary
  TestValidator.predicate(
    "has only required fields",
    Object.keys(analytics).length === 2,
  );
}
