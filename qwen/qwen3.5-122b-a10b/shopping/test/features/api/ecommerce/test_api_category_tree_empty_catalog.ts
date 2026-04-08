import api from "@ORGANIZATION/PROJECT-api";
import type { IEcommerceCategoryTree } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategoryTree";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Test category tree endpoint returns empty array when no categories exist.
 *
 * Validates that the /ecommerce/tree endpoint correctly handles the edge case of an empty category catalog. When no active categories exist in the system (either on platform initialization or after all categories have been deleted), the endpoint should return an empty array [] instead of throwing a 404 error or any other exception.
 *
 * This test ensures the API gracefully handles empty data scenarios, which is critical for:
 * - New platform initialization where no categories have been created yet
 * - Systems where all categories have been deleted by administrators
 * - Frontend applications that need to render empty catalog states properly
 *
 * 1. Call the category tree endpoint with public access (no authentication required)
 * 2. Validate response structure using typia.assert for type safety
 * 3. Verify the returned array has zero length (empty catalog)
 */
export async function test_api_category_tree_empty_catalog(
  connection: api.IConnection,
): Promise<void> {
  // Call the category tree endpoint - this is a public endpoint, no authentication needed
  const categories = await api.functional.ecommerce.tree(connection);
  // Validate response type using typia.assert
  typia.assert(categories);
  // Cast to array type to access .length property (double cast through unknown)
  const categoryList = categories as unknown as IEcommerceCategoryTree[];
  // Verify the array is empty (no categories exist in the system)
  TestValidator.equals("category count is zero", categoryList.length, 0);
}