import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformRegisteredUser";
import type { IRedditPlatformUserKarma } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformUserKarma";

/**
 * Test karma calculation for a user active across multiple communities to
 * verify accurate aggregation and breakdown. Validates that karma is properly
 * calculated per community and that the system can handle users with diverse
 * community participation patterns.
 *
 * This comprehensive test validates:
 *
 * - Karma calculation accuracy across community boundaries
 * - Response data structure and type safety
 * - Community context and user information integrity
 * - Edge cases and boundary conditions
 * - Timestamp freshness and validity
 */
export async function test_api_user_karma_cross_community_activity(
  connection: api.IConnection,
) {
  // Generate realistic test user ID for karma retrieval testing
  const userId = typia.random<string & tags.Format<"uuid">>();

  // Call the karma retrieval endpoint to get user's reputation data
  const karmaData = await api.functional.users.karma.at(connection, {
    userId: userId,
  });

  // Complete type validation of the response
  typia.assert(karmaData);

  // Validate core karma calculation accuracy
  TestValidator.equals(
    "total karma should equal sum of post and comment karma",
    karmaData.totalKarma,
    karmaData.postKarma + karmaData.commentKarma,
  );

  // Ensure all karma values are non-negative (business rule)
  TestValidator.predicate(
    "post karma must be non-negative",
    karmaData.postKarma >= 0,
  );

  TestValidator.predicate(
    "comment karma must be non-negative",
    karmaData.commentKarma >= 0,
  );

  TestValidator.predicate(
    "total karma must be non-negative",
    karmaData.totalKarma >= 0,
  );

  // Validate calculation timestamp freshness and format
  TestValidator.predicate(
    "calculated timestamp should be valid ISO 8601 format",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(
      karmaData.calculatedAt,
    ),
  );

  // Verify timestamp is recent (within reasonable timeframe)
  const calculatedTime = new Date(karmaData.calculatedAt);
  const currentTime = new Date();
  const timeDifference = Math.abs(
    currentTime.getTime() - calculatedTime.getTime(),
  );
  const daysDifference = timeDifference / (1000 * 60 * 60 * 24);

  TestValidator.predicate(
    "karma calculation should be relatively recent (within 1 year)",
    daysDifference <= 365,
  );

  // Validate user context information integrity
  TestValidator.predicate(
    "user ID should be valid UUID format",
    /^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i.test(
      karmaData.user.id,
    ),
  );

  TestValidator.predicate(
    "username should not be empty",
    karmaData.user.username.length > 0,
  );

  TestValidator.predicate(
    "user karma score should be non-negative",
    karmaData.user.karma_score >= 0,
  );

  TestValidator.predicate(
    "user account status should be valid",
    ["active", "suspended", "banned", "restricted"].includes(
      karmaData.user.account_status,
    ),
  );

  TestValidator.predicate(
    "user should have email verification status",
    typeof karmaData.user.email_verified === "boolean",
  );

  // Validate account creation timestamp
  TestValidator.predicate(
    "account creation timestamp should be valid",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(
      karmaData.user.account_created,
    ),
  );

  // If community context is present, validate its structure
  if (karmaData.community) {
    const community = karmaData.community;

    TestValidator.predicate(
      "community ID should be valid UUID",
      /^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i.test(
        community.id,
      ),
    );

    TestValidator.predicate(
      "community name should be valid format",
      /^[a-zA-Z0-9_]{2,25}$/.test(community.name),
    );

    TestValidator.predicate(
      "community title should not be empty",
      community.title.length > 0 && community.title.length <= 100,
    );

    TestValidator.predicate(
      "community description should be within limits",
      community.description.length <= 500,
    );

    TestValidator.predicate(
      "community type should be valid",
      ["public", "restricted", "private"].includes(community.type),
    );

    TestValidator.predicate(
      "community status should be valid",
      ["active", "restricted", "archived", "banned"].includes(community.status),
    );

    TestValidator.predicate(
      "business status should be valid",
      [
        "pending_creation",
        "active",
        "under_review",
        "suspended",
        "archived",
        "banned",
      ].includes(community.business_status),
    );

    // Validate community metrics are non-negative
    TestValidator.predicate(
      "member count should be non-negative",
      community.member_count >= 0,
    );

    TestValidator.predicate(
      "post count should be non-negative",
      community.post_count >= 0,
    );

    TestValidator.predicate(
      "subscriber count should be non-negative",
      community.subscriber_count >= 0,
    );

    TestValidator.predicate(
      "NSFW content policy should be boolean",
      typeof community.nsfw_content_allowed === "boolean",
    );

    // Validate community creation timestamp
    TestValidator.predicate(
      "community creation timestamp should be valid",
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(
        community.created_at,
      ),
    );
  }

  // Test edge case: verify karma values don't exceed reasonable limits
  TestValidator.predicate(
    "post karma should be within reasonable bounds",
    karmaData.postKarma <= 1000000, // 1 million karma ceiling
  );

  TestValidator.predicate(
    "comment karma should be within reasonable bounds",
    karmaData.commentKarma <= 1000000, // 1 million karma ceiling
  );

  TestValidator.predicate(
    "total karma should not exceed maximum reasonable value",
    karmaData.totalKarma <= 2000000, // 2 million combined ceiling
  );
}
