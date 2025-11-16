import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IRedditCommunityCommunityPopularStatistics } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityPopularStatistics";
import type { IRedditCommunityPopularCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPopularCommunity";

/**
 * Test public access to popular community statistics endpoint.
 *
 * Validates that the popular communities statistics can be retrieved without
 * authentication by all user types including guests. This endpoint provides
 * community discovery functionality showing the most established and successful
 * communities based on sustained popularity metrics.
 *
 * Test validates:
 *
 * 1. Public endpoint accessibility (no authentication required)
 * 2. Response structure matches IRedditCommunityCommunityPopularStatistics
 * 3. All required fields present with correct types (validated by typia.assert)
 * 4. Response contains 20-50 popular communities as per specification
 * 5. Communities ordered by popularity_score in descending order
 */
export async function test_api_popular_communities_public_access(
  connection: api.IConnection,
) {
  // Call the public endpoint without authentication
  const response: IRedditCommunityCommunityPopularStatistics =
    await api.functional.redditCommunity.statistics.communities.popular.index(
      connection,
    );

  // Validate response structure with typia - this performs COMPLETE type validation
  typia.assert(response);

  // Verify response has data array (business logic check)
  TestValidator.predicate(
    "response contains data array",
    Array.isArray(response.data),
  );

  // Verify reasonable number of communities (20-50 as per specification)
  TestValidator.predicate(
    "response contains 20-50 popular communities",
    response.data.length >= 20 && response.data.length <= 50,
  );

  // Verify at least some communities are returned for ordering test
  TestValidator.predicate(
    "response contains communities for validation",
    response.data.length > 0,
  );

  // Validate communities are ordered by popularity_score in descending order (business logic)
  for (let i = 0; i < response.data.length - 1; i++) {
    TestValidator.predicate(
      `community at index ${i} has popularity_score >= next community`,
      response.data[i].popularity_score >=
        response.data[i + 1].popularity_score,
    );
  }
}
