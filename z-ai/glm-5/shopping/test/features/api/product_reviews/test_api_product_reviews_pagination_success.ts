import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallReview";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReview";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_product_reviews_pagination_success(
  connection: api.IConnection,
): Promise<void> {
  // Generate a random product ID for testing pagination functionality
  const productId = typia.random<string & tags.Format<"uuid">>();
  // Test 1: Request with default pagination (implicit page=1, limit=10)
  const page1 = await api.functional.shoppingMall.products.reviews.index(
    connection,
    {
      productId,
      body: {} satisfies IShoppingMallReview.IRequest,
    },
  );
  typia.assert(page1);
  // Verify pagination metadata
  TestValidator.equals("default page is 1", page1.pagination.current, 1);
  TestValidator.equals("default limit is 10", page1.pagination.limit, 10);
  // Test 2: Request with explicit page=2, limit=5
  const page2 = await api.functional.shoppingMall.products.reviews.index(
    connection,
    {
      productId,
      body: {
        page: 2,
        limit: 5,
      } satisfies IShoppingMallReview.IRequest,
    },
  );
  typia.assert(page2);
  // Verify custom pagination
  TestValidator.equals("page 2 current", page2.pagination.current, 2);
  TestValidator.equals("limit 5 applied", page2.pagination.limit, 5);
  // Test 3: Request with maximum allowed limit
  const maxLimit = await api.functional.shoppingMall.products.reviews.index(
    connection,
    {
      productId,
      body: {
        limit: 100,
      } satisfies IShoppingMallReview.IRequest,
    },
  );
  typia.assert(maxLimit);
  TestValidator.predicate(
    "max limit is 100 or less",
    maxLimit.pagination.limit <= 100,
  );
  // Test 4: Verify sorting if data exists (reviews should be sorted by created_at descending)
  if (page1.data.length >= 2) {
    const timestamps = page1.data.map((r) => new Date(r.created_at).getTime());
    const sortedTimestamps = [...timestamps].sort((a, b) => b - a);
    TestValidator.equals(
      "reviews sorted by created_at descending",
      timestamps,
      sortedTimestamps,
    );
  }
}
