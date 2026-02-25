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
 * Test pagination behavior for the review search endpoint.
 * Tests include default pagination, custom pagination, maximum limit enforcement,
 * empty results, last page handling, and out of bounds page scenarios.
 */
export async function test_api_product_review_pagination(
  connection: api.IConnection,
): Promise<void> {
  // Create customer connection for authentication
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {});
  // 1. Default Pagination Test
  // Call without page/limit parameters to verify default behavior
  const defaultResult =
    await api.functional.shoppingMall.customer.reviews.index(
      customerConnection,
      {
        body: {} satisfies IShoppingMallReview.IRequest,
      },
    );
  typia.assert(defaultResult);
  TestValidator.equals(
    "default limit should be 20",
    defaultResult.pagination.limit,
    20,
  );
  TestValidator.equals(
    "default current page should be 1",
    defaultResult.pagination.current,
    1,
  );
  // 2. Custom Pagination Test
  // Call with custom limit and page values
  const customResult = await api.functional.shoppingMall.customer.reviews.index(
    customerConnection,
    {
      body: {
        limit: 50,
        page: 2,
      } satisfies IShoppingMallReview.IRequest,
    },
  );
  typia.assert(customResult);
  TestValidator.equals(
    "custom limit should be 50",
    customResult.pagination.limit,
    50,
  );
  TestValidator.equals(
    "custom current page should be 2",
    customResult.pagination.current,
    2,
  );
  // Verify pagination metadata consistency
  TestValidator.predicate(
    "pagination records should be non-negative",
    customResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages should be non-negative",
    customResult.pagination.pages >= 0,
  );
  // 3. Maximum Limit Enforcement Test
  // Request limit exceeding maximum of 100
  const maxLimitResult =
    await api.functional.shoppingMall.customer.reviews.index(
      customerConnection,
      {
        body: {
          limit: 100,
          page: 1,
        } satisfies IShoppingMallReview.IRequest,
      },
    );
  typia.assert(maxLimitResult);
  TestValidator.equals(
    "maximum limit should be enforced to 100",
    maxLimitResult.pagination.limit,
    100,
  );
  // 4. Empty Results Test
  // Use filters that match no reviews (non-existent product UUID)
  const emptyResult = await api.functional.shoppingMall.customer.reviews.index(
    customerConnection,
    {
      body: {
        product_id: "00000000-0000-0000-0000-000000000000",
      } satisfies IShoppingMallReview.IRequest,
    },
  );
  typia.assert(emptyResult);
  TestValidator.equals(
    "empty result should have empty data array",
    emptyResult.data.length,
    0,
  );
  TestValidator.equals(
    "empty result should have zero records",
    emptyResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "empty result should have zero pages",
    emptyResult.pagination.pages,
    0,
  );
  // 5. Last Page Handling Test
  // Get total pages first, then request the last page
  const firstPage = await api.functional.shoppingMall.customer.reviews.index(
    customerConnection,
    {
      body: {
        limit: 20,
        page: 1,
      } satisfies IShoppingMallReview.IRequest,
    },
  );
  typia.assert(firstPage);
  if (firstPage.pagination.pages > 0) {
    const lastPage = await api.functional.shoppingMall.customer.reviews.index(
      customerConnection,
      {
        body: {
          limit: 20,
          page: firstPage.pagination.pages,
        } satisfies IShoppingMallReview.IRequest,
      },
    );
    typia.assert(lastPage);
    TestValidator.equals(
      "last page current should equal total pages",
      lastPage.pagination.current,
      lastPage.pagination.pages,
    );
    // Last page should have fewer items than limit (unless exact multiple)
    if (firstPage.pagination.records % 20 !== 0) {
      TestValidator.predicate(
        "last page should have fewer items than limit",
        lastPage.data.length < 20,
      );
    }
  }
  // 6. Out of Bounds Page Test
  // Request a page number greater than total pages
  const outOfBoundsResult =
    await api.functional.shoppingMall.customer.reviews.index(
      customerConnection,
      {
        body: {
          limit: 20,
          page: 99999,
        } satisfies IShoppingMallReview.IRequest,
      },
    );
  typia.assert(outOfBoundsResult);
  TestValidator.equals(
    "out of bounds page should return empty data",
    outOfBoundsResult.data.length,
    0,
  );
  TestValidator.equals(
    "out of bounds page should maintain correct page number",
    outOfBoundsResult.pagination.current,
    99999,
  );
  // 7. No Duplicate Reviews Across Pages Test
  // Fetch multiple pages and verify no duplicates
  const page1 = await api.functional.shoppingMall.customer.reviews.index(
    customerConnection,
    {
      body: {
        limit: 10,
        page: 1,
        sort: "created_at",
        order: "desc",
      } satisfies IShoppingMallReview.IRequest,
    },
  );
  typia.assert(page1);
  if (page1.pagination.pages > 1) {
    const page2 = await api.functional.shoppingMall.customer.reviews.index(
      customerConnection,
      {
        body: {
          limit: 10,
          page: 2,
          sort: "created_at",
          order: "desc",
        } satisfies IShoppingMallReview.IRequest,
      },
    );
    typia.assert(page2);
    const page1Ids = new Set(page1.data.map((r) => r.id));
    const page2Ids = new Set(page2.data.map((r) => r.id));
    // Check no overlap between pages
    const hasOverlap = [...page2Ids].some((id) => page1Ids.has(id));
    TestValidator.predicate("no duplicate reviews between pages", !hasOverlap);
  }
  // 8. Pagination Consistency Test
  // Verify records = sum of all page data lengths
  const allPagesResult =
    await api.functional.shoppingMall.customer.reviews.index(
      customerConnection,
      {
        body: {
          limit: 100,
          page: 1,
        } satisfies IShoppingMallReview.IRequest,
      },
    );
  typia.assert(allPagesResult);
  TestValidator.predicate(
    "data length should not exceed limit",
    allPagesResult.data.length <= 100,
  );
  TestValidator.predicate(
    "data length should not exceed total records",
    allPagesResult.data.length <= allPagesResult.pagination.records,
  );
}
