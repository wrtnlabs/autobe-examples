import api from "@ORGANIZATION/PROJECT-api";
import type { IEcommercePlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCategory";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Test that the category browsing endpoint returns an empty result when no categories have been created.
 *
 * Validates the public category browsing endpoint's behavior when the platform is in its initial empty state with no categories configured. This endpoint requires no authentication and serves the hierarchical category structure to customers.
 *
 * Confirms that the API correctly handles the case where no categories exist in the database, returning a properly structured response that reflects the empty browsing state rather than errors. The hierarchical browsing representation uses parent-child nesting up to two levels deep, and in an empty state, no root categories should be present.
 *
 * 1. Create an isolated connection from the base connection for the public endpoint.
 * 2. Call the public browsing endpoint without authentication.
 * 3. Validate the response conforms to the IBrowsing type structure.
 * 4. Verify the response represents an empty platform state with no root categories.
 */
export async function test_api_category_browsing_empty_state(
  connection: api.IConnection,
) {
  // 1. Create isolated connection (public endpoint, no auth needed)
  const publicConnection: api.IConnection = { host: connection.host };
  // 2. Call public browsing endpoint
  const result =
    await api.functional.ecommercePlatform.browsing(publicConnection);
  // 3. Validate response type
  typia.assert(result);
  // 4. Verify empty state - no nested child categories in empty platform
  TestValidator.predicate(
    "empty browsing state has no children",
    result.children.length === 0,
  );
}
