import api from "@ORGANIZATION/PROJECT-api";
import type { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceCategory";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_category_pagination_20_items(
  connection: api.IConnection,
): Promise<void> {
  // Fetch initial page
  const page1 = await api.functional.ecommerce.categories.index(connection, {
    body: {} satisfies IEcommerceCategory.IRequest,
  });
  typia.assert(page1);
  // Validate first page properties
  TestValidator.equals(
    "First page should include exactly 20 categories",
    page1.data.length,
    20,
  );
  TestValidator.equals(
    "First page should be page 1",
    page1.pagination.current,
    1,
  );
  TestValidator.equals("Page size should be 20", page1.pagination.limit, 20);
  // Fetch next page
  const page2 = await api.functional.ecommerce.categories.index(connection, {
    body: {} satisfies IEcommerceCategory.IRequest,
  });
  typia.assert(page2);
  // Validate second page properties
  TestValidator.equals(
    "Second page should include exactly 20 categories",
    page2.data.length,
    20,
  );
  TestValidator.equals(
    "Second page should be page 2",
    page2.pagination.current,
    2,
  );
  TestValidator.equals(
    "Page size should remain 20",
    page2.pagination.limit,
    20,
  );
  // Verify total records count
  TestValidator.predicate(
    "Total records should be at least 40",
    page2.pagination.records >= 40,
  );
}
