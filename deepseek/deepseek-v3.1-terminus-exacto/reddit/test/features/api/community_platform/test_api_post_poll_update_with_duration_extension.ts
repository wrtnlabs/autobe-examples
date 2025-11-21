import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostPoll } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostPoll";

/**
 * Test updating poll duration settings to extend voting period while respecting
 * business rules. Validates that poll duration can be increased within
 * reasonable limits and that existing votes are preserved during updates. The
 * scenario ensures that poll configuration changes maintain data integrity and
 * voting statistics accuracy.
 */
export async function test_api_post_poll_update_with_duration_extension(
  connection: api.IConnection,
) {
  // Step 1: Create member authentication
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: "testPassword123",
      display_name: RandomGenerator.name(),
      href: "https://example.com/register",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(member);

  // Note: Since we don't have a community creation API, we'll assume a valid community exists
  // In a real scenario, we would create a community first or use an existing one
  // For this test, we'll use a realistic UUID format
  const communityId = "00000000-0000-0000-0000-000000000001" satisfies string &
    tags.Format<"uuid">;

  // Step 2: Create a community platform post with poll type
  const post = await api.functional.communityPlatform.member.posts.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({
          sentences: 5,
          wordMin: 3,
          wordMax: 8,
        }),
        post_type: "poll",
        status: "published",
        community_platform_community_id: communityId,
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(post);

  // Step 3: Create initial poll configuration with shorter duration
  // Based on API documentation, the update function is used for both creation and updates
  const initialPoll =
    await api.functional.communityPlatform.member.posts.polls.update(
      connection,
      {
        postId: post.id,
        body: {
          question: "What is your favorite programming language?",
          duration_days: 7,
          max_votes_per_user: 1,
        } satisfies ICommunityPlatformPostPoll.IUpdate,
      },
    );
  typia.assert(initialPoll);

  // Step 4: Update poll duration to extend voting period
  const updatedPoll =
    await api.functional.communityPlatform.member.posts.polls.update(
      connection,
      {
        postId: post.id,
        body: {
          duration_days: 14,
        } satisfies ICommunityPlatformPostPoll.IUpdate,
      },
    );
  typia.assert(updatedPoll);

  // Step 5: Validate that poll data remains consistent after update
  TestValidator.equals(
    "poll ID should remain the same",
    updatedPoll.id,
    initialPoll.id,
  );
  TestValidator.equals(
    "post ID reference should remain the same",
    updatedPoll.community_platform_post_id,
    post.id,
  );
  TestValidator.equals(
    "question should remain unchanged",
    updatedPoll.question,
    initialPoll.question,
  );
  TestValidator.equals(
    "max votes per user should remain unchanged",
    updatedPoll.max_votes_per_user,
    initialPoll.max_votes_per_user,
  );
  TestValidator.equals(
    "total votes should remain unchanged",
    updatedPoll.total_votes,
    initialPoll.total_votes,
  );

  // Step 6: Validate duration extension and expiration date logic
  TestValidator.equals(
    "duration should be extended to 14 days",
    updatedPoll.duration_days,
    14,
  );
  TestValidator.notEquals(
    "expiration date should be updated",
    updatedPoll.expires_at,
    initialPoll.expires_at,
  );

  // Validate that creation timestamp remains unchanged
  TestValidator.equals(
    "creation timestamp should remain unchanged",
    updatedPoll.created_at,
    initialPoll.created_at,
  );

  // Additional validation: Check that expiration date is logically after creation date
  const createdDate = new Date(updatedPoll.created_at);
  const expiresDate = new Date(updatedPoll.expires_at);
  TestValidator.predicate(
    "expiration date should be after creation date",
    expiresDate > createdDate,
  );

  // Validate duration calculation (approximately)
  const durationMs = expiresDate.getTime() - createdDate.getTime();
  const expectedDurationMs = 14 * 24 * 60 * 60 * 1000; // 14 days in milliseconds
  const toleranceMs = 24 * 60 * 60 * 1000; // 1 day tolerance for timezone/rounding
  TestValidator.predicate(
    "expiration should be approximately 14 days after creation",
    Math.abs(durationMs - expectedDurationMs) <= toleranceMs,
  );
}
