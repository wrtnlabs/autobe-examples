import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformRegisteredUser";
import type { IRedditPlatformUserKarma } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformUserKarma";

/**
 * Test successful retrieval of community-specific karma scores for an active
 * user.
 *
 * This E2E test validates the GET
 * /redditPlatform/users/{userId}/karma/communities endpoint to ensure it
 * returns comprehensive karma breakdown showing post and comment karma per
 * community with proper user and community context. The test verifies that the
 * response structure matches IRedditPlatformUserKarma.ISummary schema with all
 * required fields present and that karma calculations are accurate.
 *
 * The test validates:
 *
 * - Successful API response without errors
 * - Response type matches IRedditPlatformUserKarma.ISummary exactly
 * - All required fields are present (id, user, postKarma, commentKarma,
 *   totalKarma, calculatedAt)
 * - Community context is properly included when available
 * - User context matches expected structure
 * - Karma calculation accuracy (totalKarma = postKarma + commentKarma)
 * - Proper timestamp format and data integrity
 * - Type safety for all numeric values (int32 types)
 */
export async function test_api_user_karma_communities_successful_retrieval(
  connection: api.IConnection,
) {
  // Generate a valid UUID for the target user
  const userId = typia.random<string & tags.Format<"uuid">>();

  // Call the API endpoint to retrieve community-specific karma scores
  const karmaData =
    await api.functional.redditPlatform.users.karma.communities.at(connection, {
      userId: userId,
    });

  // Validate the response structure and type safety
  typia.assert(karmaData);

  // Validate that all required fields are present and properly typed
  TestValidator.equals("karma record ID is valid UUID", karmaData.id, userId);
  TestValidator.predicate(
    "calculatedAt timestamp is valid ISO 8601 format",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(
      karmaData.calculatedAt,
    ),
  );

  // Validate user context is properly included
  TestValidator.predicate(
    "user context is present",
    karmaData.user !== null && karmaData.user !== undefined,
  );
  TestValidator.predicate(
    "user has valid UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      karmaData.user.id,
    ),
  );
  TestValidator.predicate(
    "user has valid username",
    typeof karmaData.user.username === "string" &&
      karmaData.user.username.length > 0,
  );
  TestValidator.predicate(
    "user has valid karma score",
    typeof karmaData.user.karma_score === "number" &&
      karmaData.user.karma_score >= 0,
  );

  // Validate karma breakdown data types and constraints
  TestValidator.predicate(
    "postKarma is valid int32 type",
    typeof karmaData.postKarma === "number" &&
      Number.isInteger(karmaData.postKarma),
  );
  TestValidator.predicate(
    "commentKarma is valid int32 type",
    typeof karmaData.commentKarma === "number" &&
      Number.isInteger(karmaData.commentKarma),
  );
  TestValidator.predicate(
    "totalKarma is valid int32 type",
    typeof karmaData.totalKarma === "number" &&
      Number.isInteger(karmaData.totalKarma),
  );

  // Validate karma calculation accuracy
  TestValidator.equals(
    "total karma equals sum of post and comment karma",
    karmaData.totalKarma,
    karmaData.postKarma + karmaData.commentKarma,
  );

  // Validate community context if present
  if (karmaData.community) {
    TestValidator.predicate(
      "community has valid UUID",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        karmaData.community.id,
      ),
    );
    TestValidator.predicate(
      "community has valid name",
      typeof karmaData.community.name === "string" &&
        karmaData.community.name.length > 0,
    );
    TestValidator.predicate(
      "community has valid title",
      typeof karmaData.community.title === "string" &&
        karmaData.community.title.length > 0,
    );
    TestValidator.predicate(
      "community has valid type",
      ["public", "restricted", "private"].includes(karmaData.community.type),
    );
    TestValidator.predicate(
      "community has valid status",
      ["active", "restricted", "archived", "banned"].includes(
        karmaData.community.status,
      ),
    );
    TestValidator.predicate(
      "community has valid member count",
      typeof karmaData.community.member_count === "number" &&
        karmaData.community.member_count >= 0,
    );
  }

  // Validate that karma values are reasonable (non-negative and within int32 range)
  TestValidator.predicate(
    "postKarma is within valid range",
    karmaData.postKarma >= 0 && karmaData.postKarma <= 2147483647,
  );
  TestValidator.predicate(
    "commentKarma is within valid range",
    karmaData.commentKarma >= 0 && karmaData.commentKarma <= 2147483647,
  );
  TestValidator.predicate(
    "totalKarma is within valid range",
    karmaData.totalKarma >= 0 && karmaData.totalKarma <= 2147483647,
  );
}
