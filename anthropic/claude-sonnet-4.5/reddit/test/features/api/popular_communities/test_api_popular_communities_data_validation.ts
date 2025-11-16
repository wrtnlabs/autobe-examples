import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IRedditCommunityCommunityPopularStatistics } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityPopularStatistics";
import type { IRedditCommunityPopularCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPopularCommunity";

/**
 * Comprehensive data validation test for popular community statistics endpoint.
 *
 * This test validates that the popular communities statistics API returns
 * properly structured data with all required fields present and correctly
 * formatted. It performs extensive validation on:
 *
 * 1. Overall response structure matching
 *    IRedditCommunityCommunityPopularStatistics
 * 2. UUID format validation for id and creator_member_id fields
 * 3. Community name format (3-21 chars, lowercase alphanumeric with underscores)
 * 4. Display title length (max 100 characters) with Unicode support
 * 5. Description length (max 500 characters)
 * 6. Non-negative integer validation for subscriber_count and post_count
 * 7. Proper numeric types for engagement_rate and popularity_score
 * 8. Valid URI formats for optional icon_url and banner_url fields
 * 9. ISO 8601 date-time format for created_at timestamps
 * 10. Realistic value ranges for all numeric metrics
 * 11. Proper null handling (only icon_url and banner_url can be null/undefined)
 */
export async function test_api_popular_communities_data_validation(
  connection: api.IConnection,
) {
  // Call the popular communities statistics endpoint
  const response: IRedditCommunityCommunityPopularStatistics =
    await api.functional.redditCommunity.statistics.communities.popular.index(
      connection,
    );

  // Validate the entire response structure with typia - this performs complete type validation
  typia.assert(response);

  // Verify that data array exists and is an array
  TestValidator.predicate(
    "response should contain data array",
    Array.isArray(response.data),
  );

  // Validate each community in the data array
  for (const community of response.data) {
    // typia.assert already validated all type constraints, but we add business logic validations

    // Validate name field format: 3-21 characters, lowercase alphanumeric with underscores only
    TestValidator.predicate(
      "name should be 3-21 chars lowercase alphanumeric with underscores",
      community.name.length >= 3 &&
        community.name.length <= 21 &&
        /^[a-z0-9_]+$/.test(community.name),
    );

    // Validate display_title length (max 100 characters)
    TestValidator.predicate(
      "display_title should not exceed 100 characters",
      community.display_title.length <= 100,
    );

    // Validate description length (max 500 characters)
    TestValidator.predicate(
      "description should not exceed 500 characters",
      community.description.length <= 500,
    );

    // Validate subscriber_count is within realistic range (non-negative, reasonable upper bound)
    TestValidator.predicate(
      "subscriber_count should be non-negative and realistic",
      community.subscriber_count >= 0 &&
        community.subscriber_count <= 1000000000,
    );

    // Validate post_count is within realistic range (non-negative, reasonable upper bound)
    TestValidator.predicate(
      "post_count should be non-negative and realistic",
      community.post_count >= 0 && community.post_count <= 10000000000,
    );

    // Validate engagement_rate is a valid normalized metric (0 to 10 for reasonable engagement)
    TestValidator.predicate(
      "engagement_rate should be a valid normalized metric",
      typeof community.engagement_rate === "number" &&
        !isNaN(community.engagement_rate) &&
        isFinite(community.engagement_rate) &&
        community.engagement_rate >= 0 &&
        community.engagement_rate <= 10,
    );

    // Validate popularity_score is a valid number
    TestValidator.predicate(
      "popularity_score should be a valid number",
      typeof community.popularity_score === "number" &&
        !isNaN(community.popularity_score) &&
        isFinite(community.popularity_score),
    );

    // Validate created_at is a parseable date
    TestValidator.predicate(
      "created_at should be a valid date",
      !isNaN(new Date(community.created_at).getTime()),
    );

    // Validate created_at represents a realistic community creation date (not future, within last 25 years)
    const createdDate = new Date(community.created_at);
    const now = new Date();
    const twentyFiveYearsAgo = new Date(
      now.getFullYear() - 25,
      now.getMonth(),
      now.getDate(),
    );

    TestValidator.predicate(
      "created_at should be realistic (not in future, within last 25 years)",
      createdDate <= now && createdDate >= twentyFiveYearsAgo,
    );
  }
}
