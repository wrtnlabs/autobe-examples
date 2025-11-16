import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformKarmaScore } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformKarmaScore";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

/**
 * Validates that the /my/karmaScores API endpoint returns a complete and
 * properly structured karma score response with all required fields having
 * correct types and values.
 *
 * This test verifies response completeness and data integrity:
 *
 * 1. Creates a new member account through authentication
 * 2. Retrieves the authenticated member's karma scores
 * 3. Validates all required fields are present with correct types via
 *    typia.assert()
 * 4. Verifies total_karma equals sum of post_karma and comment_karma
 */
export async function test_api_my_karma_scores_response_completeness(
  connection: api.IConnection,
) {
  // Step 1: Create a new member account through authentication
  const memberResponse = await api.functional.auth.member.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: typia.random<
        string &
          tags.MinLength<3> &
          tags.MaxLength<50> &
          tags.Pattern<"^[a-zA-Z0-9_-]+$">
      >(),
      password: "TestPassword123!",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(memberResponse);

  // Step 2: Retrieve the authenticated member's karma scores
  const karmaScore: ICommunityPlatformKarmaScore =
    await api.functional.my.karmaScores.at(connection);
  typia.assert(karmaScore);

  // Step 3: Validate all required fields are present with correct types and structure
  // typia.assert() above already validates:
  // - All required fields present (id, community_platform_member_id, post_karma, comment_karma, total_karma, created_at, updated_at)
  // - All fields have correct types (UUIDs, integers, datetime strings)
  // - No unexpected fields present
  // - All timestamps are valid ISO 8601 format
  // - All karma values are non-negative integers

  // Step 4: Verify total_karma equals sum of post_karma and comment_karma
  TestValidator.equals(
    "total_karma equals sum of post_karma and comment_karma",
    karmaScore.total_karma,
    karmaScore.post_karma + karmaScore.comment_karma,
  );
}
