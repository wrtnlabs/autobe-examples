import api from "@ORGANIZATION/PROJECT-api";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallCustomer";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_product_search_with_category_filter(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup: Create test categories and products
  const adminConnection: api.IConnection = { host: connection.host };
  // Create root category
  const rootCategory = await api.functional.ecommerceMall.products.index(
    adminConnection,
    {
      body: {
        limit: 10,
        page: 1,
      },
    },
  );
  typia.assert(rootCategory);
  // 2. Execute search with category filter
  const categoryFilter = rootCategory.data[0]?.id;
  if (!categoryFilter) {
    throw new Error("No categories found to test with");
  }
  const result = await api.functional.ecommerceMall.products.index(connection, {
    body: {
      category_id: categoryFilter,
      limit: 20,
      page: 1,
    },
  });
  typia.assert(result);
  // 3. Validate search results
  TestValidator.predicate("has results", result.data.length > 0);
  TestValidator.equals(
    "pagination matches request",
    result.pagination.limit,
    20,
  );
  TestValidator.predicate(
    "pagination current page is 1",
    result.pagination.current === 1,
  );
  TestValidator.predicate(
    "pagination records > 0",
    result.pagination.records > 0,
  );
}
