import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityCommunity";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityCommunity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Test retrieving popular communities when no communities exist.
 *
 * This test validates that the popular communities endpoint returns
 * a properly formatted empty response when the platform has no active communities.
 *
 * **Test Flow**:
 * 1. Call GET /community/communities/popular (public endpoint, no auth required)
 * 2. Verify response structure with empty data array
 * 3. Validate pagination metadata correctly reflects zero records
 */
export async function test_api_community_popular_empty_list(
  connection: api.IConnection,
): Promise<void> {
  // Call the popular communities endpoint
  const response =
    await api.functional.community.communities.popular(connection);
  typia.assert(response);
  // Verify empty data array
  TestValidator.equals("data array should be empty", response.data, []);
  // Verify pagination metadata reflects zero records
  TestValidator.equals(
    "current page should be 1",
    response.pagination.current,
    1,
  );
  TestValidator.equals(
    "records count should be 0",
    response.pagination.records,
    0,
  );
  TestValidator.equals("pages count should be 0", response.pagination.pages, 0);
}
