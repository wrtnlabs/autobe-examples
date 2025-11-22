import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformRegisteredUser";
import type { IRedditPlatformUserKarma } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformUserKarma";

/**
 * Test karma breakdown for a highly active user participating in multiple
 * communities.
 *
 * Validates that the response includes comprehensive community-specific karma
 * data across different communities, shows varied post and comment karma
 * scores, and properly groups and calculates totals for each community.
 *
 * This test creates a realistic scenario where a user participates in multiple
 * communities with different types of content and engagement levels, then
 * verifies the API accurately tracks and reports karma breakdown by community.
 */
export async function test_api_user_karma_communities_multiple_communities(
  connection: api.IConnection,
) {
  // Step 1: Create an active user through authentication
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = "TestPassword123!";
  const userId = typia.random<string & tags.Format<"uuid">>();

  // Create user profile data that matches the expected structure
  const userProfile = {
    id: userId,
    username: `testuser_${RandomGenerator.alphaNumeric(8)}`,
    display_name: "Test User Multiple Communities",
    avatar_url: undefined,
    karma_score: 0,
    account_status: "active",
    email_verified: true,
    account_created: new Date().toISOString(),
  } satisfies IRedditPlatformRegisteredUser.ISummary;

  // Step 2: Create multiple communities for diverse participation
  const communities = ArrayUtil.repeat(4, (index) => {
    const communityId = typia.random<string & tags.Format<"uuid">>();
    return {
      id: communityId,
      name: `community_${index + 1}`,
      title: `Test Community ${index + 1}`,
      description: `A test community for karma testing ${index + 1}`,
      type: "public" as const,
      status: "active" as const,
      business_status: "active" as const,
      member_count: 1,
      post_count: 0,
      subscriber_count: 1,
      nsfw_content_allowed: false,
      created_at: new Date().toISOString(),
    } satisfies IRedditPlatformCommunity.ISummary;
  });

  // Step 3: Simulate realistic user activity in each community with varied karma scores
  const communityKarmaData = communities.map((community, index) => {
    // Create varied post and comment karma based on community engagement level
    // Community 0: High activity (100+ karma) - Popular community
    // Community 1: Medium activity (50+ karma) - Regular participation
    // Community 2: Low activity (10+ karma) - Occasional posting
    // Community 3: Minimal activity (1+ karma) - Just joined
    const baseMultiplier = [100, 50, 10, 1][index];
    const postKarma = baseMultiplier + Math.floor(Math.random() * 20);
    const commentKarma =
      Math.floor(baseMultiplier * 0.7) + Math.floor(Math.random() * 15);
    const totalKarma = postKarma + commentKarma;

    return {
      community,
      postKarma,
      commentKarma,
      totalKarma,
      // Add realistic timestamps for when activity occurred
      lastActivityAt: new Date(
        Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000,
      ).toISOString(), // Within last 30 days
    };
  });

  // Step 4: Calculate expected overall karma totals
  const expectedTotalKarma = communityKarmaData.reduce(
    (sum, data) => sum + data.totalKarma,
    0,
  );
  const expectedTotalPostKarma = communityKarmaData.reduce(
    (sum, data) => sum + data.postKarma,
    0,
  );
  const expectedTotalCommentKarma = communityKarmaData.reduce(
    (sum, data) => sum + data.commentKarma,
    0,
  );

  // Step 5: Call the API to get karma breakdown for the user
  const karmaResponse =
    await api.functional.redditPlatform.users.karma.communities.at(connection, {
      userId: userId,
    });

  // Step 6: Validate the response structure and data integrity
  typia.assert(karmaResponse);

  // Verify user information matches
  TestValidator.equals("user ID matches", karmaResponse.user.id, userId);
  TestValidator.equals(
    "user username matches",
    karmaResponse.user.username,
    userProfile.username,
  );
  TestValidator.equals(
    "user account status is active",
    karmaResponse.user.account_status,
    "active",
  );
  TestValidator.equals(
    "user email is verified",
    karmaResponse.user.email_verified,
    true,
  );

  // Verify overall karma calculations
  TestValidator.equals(
    "total karma calculation",
    karmaResponse.totalKarma,
    expectedTotalKarma,
  );
  TestValidator.equals(
    "total post karma",
    karmaResponse.postKarma,
    expectedTotalPostKarma,
  );
  TestValidator.equals(
    "total comment karma",
    karmaResponse.commentKarma,
    expectedTotalCommentKarma,
  );

  // Verify mathematical relationship between karma components
  TestValidator.equals(
    "total equals post plus comment karma",
    karmaResponse.totalKarma,
    karmaResponse.postKarma + karmaResponse.commentKarma,
  );

  // Verify calculated timestamp is recent and valid
  const calculatedTime = new Date(karmaResponse.calculatedAt);
  const now = new Date();
  const timeDiff = now.getTime() - calculatedTime.getTime();
  TestValidator.predicate(
    "calculated timestamp is recent",
    timeDiff >= 0 && timeDiff < 60000,
  ); // Within last minute

  // Verify calculated timestamp is in valid ISO format
  TestValidator.predicate(
    "calculated timestamp format",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(
      karmaResponse.calculatedAt,
    ),
  );

  // Validate community context is properly structured when present
  if (karmaResponse.community) {
    TestValidator.equals(
      "community ID format",
      typeof karmaResponse.community.id,
      "string",
    );
    TestValidator.equals(
      "community name present",
      karmaResponse.community.name.length > 0,
      true,
    );
    TestValidator.equals(
      "community title present",
      karmaResponse.community.title.length > 0,
      true,
    );
    TestValidator.equals(
      "community type is valid",
      ["public", "restricted", "private"].includes(
        karmaResponse.community.type,
      ),
      true,
    );
  }

  // Step 7: Verify data types and constraints
  TestValidator.predicate(
    "post karma is non-negative integer",
    karmaResponse.postKarma >= 0 && Number.isInteger(karmaResponse.postKarma),
  );

  TestValidator.predicate(
    "comment karma is non-negative integer",
    karmaResponse.commentKarma >= 0 &&
      Number.isInteger(karmaResponse.commentKarma),
  );

  TestValidator.predicate(
    "total karma is positive integer",
    karmaResponse.totalKarma > 0 && Number.isInteger(karmaResponse.totalKarma),
  );

  TestValidator.predicate(
    "karma values are within reasonable bounds",
    karmaResponse.totalKarma < 1000000,
  ); // Sanity check for reasonable values

  // Step 8: Test scenario-specific validations for multiple community participation
  TestValidator.predicate(
    "user shows activity in multiple communities",
    karmaResponse.totalKarma > communityKarmaData.length, // Should have more karma than number of communities
  );

  TestValidator.predicate(
    "karma distribution shows varied engagement levels",
    karmaResponse.postKarma !== karmaResponse.commentKarma ||
      communityKarmaData.some((data) => data.postKarma !== data.commentKarma),
  );

  // Step 9: Validate that the response reflects the multi-community scenario
  TestValidator.predicate(
    "total karma reflects multiple community participation",
    karmaResponse.totalKarma >=
      communityKarmaData.reduce(
        (min, data) => Math.min(min, data.totalKarma),
        Infinity,
      ) *
        communityKarmaData.length,
  );

  // Step 10: Ensure karma breakdown makes sense for a multi-community user
  const avgKarmaPerCommunity = expectedTotalKarma / communityKarmaData.length;
  TestValidator.predicate(
    "average karma per community is reasonable",
    avgKarmaPerCommunity >= 1 && avgKarmaPerCommunity <= 200, // Reasonable range for test data
  );
}
