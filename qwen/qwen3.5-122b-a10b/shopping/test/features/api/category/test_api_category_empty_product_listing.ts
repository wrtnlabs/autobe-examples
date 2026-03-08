import api from "@ORGANIZATION/PROJECT-api";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallProduct";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Test empty category product listing.
 *
 * Test that when browsing a category with no products assigned, the system
 * returns a valid response with an empty data array and correct pagination metadata.
 */
export async function test_api_category_empty_product_listing(
  connection: api.IConnection,
): Promise<void> {
  // Use a random UUID for category ID (category with no products)
  const categoryId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // Query the category products endpoint with empty category
  const output: IPageIEcommerceMallProduct.ISummary =
    await api.functional.ecommerceMall.categories.products.index(connection, {
      categoryId,
      body: {
        page: 1,
        limit: 20,
      } satisfies IEcommerceMallProduct.IRequest,
    });
  typia.assert(output);
  // Validate empty data array
  TestValidator.equals("data array is empty", output.data.length, 0);
  // Validate pagination metadata for empty results
  TestValidator.equals("current page is 1", output.pagination.current, 1);
  TestValidator.equals("limit is 20", output.pagination.limit, 20);
  TestValidator.equals("records count is 0", output.pagination.records, 0);
  TestValidator.equals("pages count is 0", output.pagination.pages, 0);
}
