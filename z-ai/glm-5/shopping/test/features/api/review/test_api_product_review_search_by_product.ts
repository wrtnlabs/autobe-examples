import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallReview";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReview";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

/**
 * Test the primary success path for searching and retrieving reviews for a specific product.
 *
 * This test validates the review search functionality with product_id filter,
 * ensuring proper pagination structure, response validation, and field completeness.
 *
 * **Test Setup:**
 * - Use existing product reviews in the database (or assume reviews exist from previous test scenarios)
 *
 * **Test Steps:**
 * 1. Call the review search endpoint with product_id filter to retrieve all reviews for a specific product
 * 2. Verify the response contains paginated results with IPageIShoppingMallReview.ISummary structure
 * 3. Validate each review summary contains:
 *    - id (UUID format)
 *    - rating (1-5 integer)
 *    - content (nullable string)
 *    - customer object with id and displayName
 *    - product object with id, name, and basic info
 *    - verified boolean indicating purchase verification
 *    - created_at timestamp
 * 4. Verify pagination metadata includes current page, limit, total records, and total pages
 * 5. Verify results are sorted by created_at DESC by default (newest first)
 */
export async function test_api_product_review_search_by_product(
  connection: api.IConnection,
): Promise<void> {
  // Create a customer connection for testing (optional - endpoint is public)
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {});
  // Generate a random product ID for testing
  const productId = typia.random<string & tags.Format<"uuid">>();
  // Test 1: Call the review search endpoint with product_id filter
  const response = await api.functional.shoppingMall.customer.reviews.index(
    customerConnection,
    {
      body: {
        product_id: productId,
      } satisfies IShoppingMallReview.IRequest,
    },
  );
  typia.assert(response);
  // Test 2: Verify pagination metadata structure is present and valid
  // (pagination fields are validated by typia.assert above)
  // Test 3: Validate each review summary has required fields
  // (All fields validated by typia.assert - no redundant checks needed)
  // Test 4: Verify default sorting is by created_at DESC (newest first)
  if (response.data.length > 1) {
    for (let i = 0; i < response.data.length - 1; i++) {
      const currentCreatedAt = new Date(response.data[i].created_at).getTime();
      const nextCreatedAt = new Date(response.data[i + 1].created_at).getTime();
      TestValidator.predicate(
        "reviews sorted by created_at DESC",
        currentCreatedAt >= nextCreatedAt,
      );
    }
  }
  // Test 5: Verify pagination parameters work correctly
  const page1Response =
    await api.functional.shoppingMall.customer.reviews.index(
      customerConnection,
      {
        body: {
          product_id: productId,
          page: 1,
          limit: 5,
        } satisfies IShoppingMallReview.IRequest,
      },
    );
  typia.assert(page1Response);
  TestValidator.equals(
    "pagination limit matches request",
    page1Response.pagination.limit,
    5,
  );
  TestValidator.equals(
    "pagination current page is 1",
    page1Response.pagination.current,
    1,
  );
}
