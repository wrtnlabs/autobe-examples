import api from "@ORGANIZATION/PROJECT-api";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Test that browsing categories returns an empty array when no categories have been created on the platform yet.
 *
 * Steps:
 * 1. Make a GET request to /ecommerceMall/categories without any authentication headers
 * 2. Verify the response returns HTTP 200 status code
 * 3. Validate the response body is an empty array []
 * 4. This ensures the endpoint handles the empty state gracefully without errors
 */
export async function test_api_category_browse_empty_state(
  connection: api.IConnection,
): Promise<void> {
  // <E2E TEST CODE HERE>
  // Call the browse endpoint - returns IEcommerceMallCategory (not array)
  const output: IEcommerceMallCategory =
    await api.functional.ecommerceMall.categories.browse(connection);
  // Validate the response structure
  typia.assert(output);
  // When no categories exist, subcategories should be empty
  TestValidator.equals(
    "subcategories list is empty",
    output.subcategories.length,
    0,
  );
}
