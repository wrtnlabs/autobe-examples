import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ICommunityPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProduct";
import type { ICommunityPlatformProductSpecificationFilter } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProductSpecificationFilter";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformProduct";
export async function test_api_product_search_empty_results(
  connection: api.IConnection,
): Promise<void> {
  // Generate a random, non-existent UUID for category_id
  const nonExistentCategoryId = typia.random<string & tags.Format<"uuid">>();
  // Create search request with impossible filter combination
  const searchRequest = {
    name: "nonexistentproduct12345",
    category_id: nonExistentCategoryId,
  } satisfies ICommunityPlatformProduct.IRequest;
  // Perform the search
  const result: IPageICommunityPlatformProduct =
    await api.functional.communityPlatform.search.products.index(connection, {
      body: searchRequest,
    });
  // Validate the response structure
  typia.assert(result);
  // Verify the data array is empty
  TestValidator.equals("data array should be empty", result.data.length, 0);
  // Verify pagination metadata - only records and pages as specified in the scenario
  TestValidator.equals("records should be 0", result.pagination.records, 0);
  TestValidator.equals("pages should be 0", result.pagination.pages, 0);
}
