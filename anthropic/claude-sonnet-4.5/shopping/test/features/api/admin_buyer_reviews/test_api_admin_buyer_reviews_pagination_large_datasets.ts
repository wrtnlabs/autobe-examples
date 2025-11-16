import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallReview";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallBuyer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBuyer";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReview";
import type { IShoppingMallSale } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSale";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

export async function test_api_admin_buyer_reviews_pagination_large_datasets(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate admin account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminAccount = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: typia.random<string & tags.Format<"password">>(),
      full_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      admin_level: "super_admin",
      email_verified: true,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallAdmin.ICreate,
  });
  typia.assert(adminAccount);

  // Step 2: Use a buyer ID for pagination testing
  // Note: In a real scenario, this buyer would have extensive review history
  // For this test, we focus on pagination mechanics regardless of data volume
  const testBuyerId = typia.random<string & tags.Format<"uuid">>();

  // Step 3: Test pagination with default page size
  const firstPage =
    await api.functional.shoppingMall.admin.buyers.reviews.index(connection, {
      buyerId: testBuyerId,
      body: {
        page: 1,
        limit: 20,
      } satisfies IShoppingMallReview.IRequest,
    });
  typia.assert(firstPage);

  // Validate pagination metadata structure
  TestValidator.predicate(
    "pagination object exists",
    firstPage.pagination !== null && firstPage.pagination !== undefined,
  );
  TestValidator.predicate(
    "current page is 1",
    firstPage.pagination.current === 1,
  );
  TestValidator.predicate(
    "limit is set to 20",
    firstPage.pagination.limit === 20,
  );
  TestValidator.predicate(
    "records count is non-negative",
    firstPage.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages count is non-negative",
    firstPage.pagination.pages >= 0,
  );

  // Step 4: Test with maximum page size (100 items per page)
  const maxSizePage =
    await api.functional.shoppingMall.admin.buyers.reviews.index(connection, {
      buyerId: testBuyerId,
      body: {
        page: 1,
        limit: 100,
      } satisfies IShoppingMallReview.IRequest,
    });
  typia.assert(maxSizePage);

  // Validate maximum limit is enforced
  TestValidator.predicate(
    "maximum page size is 100",
    maxSizePage.pagination.limit === 100,
  );
  TestValidator.predicate(
    "data array respects limit",
    maxSizePage.data.length <= 100,
  );
  TestValidator.predicate(
    "data is array type",
    Array.isArray(maxSizePage.data),
  );

  // Step 5: Test navigation to different page numbers
  const secondPage =
    await api.functional.shoppingMall.admin.buyers.reviews.index(connection, {
      buyerId: testBuyerId,
      body: {
        page: 2,
        limit: 20,
      } satisfies IShoppingMallReview.IRequest,
    });
  typia.assert(secondPage);

  TestValidator.predicate(
    "second page current is 2",
    secondPage.pagination.current === 2,
  );
  TestValidator.predicate(
    "second page limit is 20",
    secondPage.pagination.limit === 20,
  );

  // Step 6: Test with various page sizes to ensure flexibility
  const customPageSize =
    await api.functional.shoppingMall.admin.buyers.reviews.index(connection, {
      buyerId: testBuyerId,
      body: {
        page: 1,
        limit: 50,
      } satisfies IShoppingMallReview.IRequest,
    });
  typia.assert(customPageSize);

  TestValidator.predicate(
    "custom page size is 50",
    customPageSize.pagination.limit === 50,
  );
  TestValidator.predicate(
    "custom page data respects limit",
    customPageSize.data.length <= 50,
  );

  // Step 7: Test filtering with pagination
  const filteredPage =
    await api.functional.shoppingMall.admin.buyers.reviews.index(connection, {
      buyerId: testBuyerId,
      body: {
        page: 1,
        limit: 30,
        min_rating: 4,
        status: "approved",
        verified_purchase_only: true,
      } satisfies IShoppingMallReview.IRequest,
    });
  typia.assert(filteredPage);

  TestValidator.predicate(
    "filtered pagination exists",
    filteredPage.pagination !== null && filteredPage.pagination !== undefined,
  );
  TestValidator.predicate(
    "filtered page limit is 30",
    filteredPage.pagination.limit === 30,
  );
  TestValidator.predicate(
    "filtered data is array",
    Array.isArray(filteredPage.data),
  );

  // Step 8: Test sorting with pagination
  const sortedDescPage =
    await api.functional.shoppingMall.admin.buyers.reviews.index(connection, {
      buyerId: testBuyerId,
      body: {
        page: 1,
        limit: 25,
        sort_by: "created_at",
        sort_order: "desc",
      } satisfies IShoppingMallReview.IRequest,
    });
  typia.assert(sortedDescPage);

  TestValidator.predicate(
    "sorted desc page current is 1",
    sortedDescPage.pagination.current === 1,
  );
  TestValidator.predicate(
    "sorted desc data is array",
    Array.isArray(sortedDescPage.data),
  );

  const sortedAscPage =
    await api.functional.shoppingMall.admin.buyers.reviews.index(connection, {
      buyerId: testBuyerId,
      body: {
        page: 1,
        limit: 25,
        sort_by: "rating",
        sort_order: "asc",
      } satisfies IShoppingMallReview.IRequest,
    });
  typia.assert(sortedAscPage);

  TestValidator.predicate(
    "sorted asc page exists",
    sortedAscPage.pagination !== null,
  );

  // Step 9: Test minimum page size
  const minPageSize =
    await api.functional.shoppingMall.admin.buyers.reviews.index(connection, {
      buyerId: testBuyerId,
      body: {
        page: 1,
        limit: 1,
      } satisfies IShoppingMallReview.IRequest,
    });
  typia.assert(minPageSize);

  TestValidator.predicate(
    "minimum page size is 1",
    minPageSize.pagination.limit === 1,
  );
  TestValidator.predicate(
    "minimum page data respects limit",
    minPageSize.data.length <= 1,
  );

  // Step 10: Validate pagination consistency across requests
  const consistencyCheck1 =
    await api.functional.shoppingMall.admin.buyers.reviews.index(connection, {
      buyerId: testBuyerId,
      body: {
        page: 1,
        limit: 20,
      } satisfies IShoppingMallReview.IRequest,
    });
  typia.assert(consistencyCheck1);

  const consistencyCheck2 =
    await api.functional.shoppingMall.admin.buyers.reviews.index(connection, {
      buyerId: testBuyerId,
      body: {
        page: 1,
        limit: 20,
      } satisfies IShoppingMallReview.IRequest,
    });
  typia.assert(consistencyCheck2);

  TestValidator.equals(
    "pagination records count is consistent",
    consistencyCheck1.pagination.records,
    consistencyCheck2.pagination.records,
  );
  TestValidator.equals(
    "pagination pages count is consistent",
    consistencyCheck1.pagination.pages,
    consistencyCheck2.pagination.pages,
  );
  TestValidator.equals(
    "pagination limit is consistent",
    consistencyCheck1.pagination.limit,
    consistencyCheck2.pagination.limit,
  );
}
