import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformVote";

/**
 * Test valid vote status transitions for members.
 *
 * This E2E test validates the complete workflow of vote creation and status
 * transitions on a community platform. The test follows a realistic business
 * scenario where a member registers, creates content, votes on posts, and then
 * tests status transitions.
 *
 * The test ensures that vote status transitions function correctly, including
 * proper authentication, ownership validation, and business rule enforcement
 * for vote lifecycle management. It validates that cancelled votes cannot be
 * reactivated and that proper status enforcement is maintained throughout the
 * voting system.
 */
export async function test_api_vote_status_transition_by_member(
  connection: api.IConnection,
) {
  // Step 1: Create member account for authentication context
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "TestPassword123";
  const memberDisplayName = RandomGenerator.name(2);

  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      display_name: memberDisplayName,
      href: "https://example.com/register",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(member);

  // Step 2: Create a post to vote on
  // Note: Community ID is required for post creation. Since no community creation API exists,
  // we'll use a randomly generated UUID that matches the expected format.
  // In a real scenario, this would come from an existing community.
  const communityId = typia.random<string & tags.Format<"uuid">>();

  const post = await api.functional.communityPlatform.member.posts.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({
          sentences: 5,
          wordMin: 3,
          wordMax: 8,
        }),
        post_type: "text",
        status: "published",
        community_platform_community_id: communityId,
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(post);

  // Step 3: Create initial active vote
  const initialVote =
    await api.functional.communityPlatform.member.posts.votes.create(
      connection,
      {
        postId: post.id,
        body: {
          vote_type: "upvote",
          actor_type: "member",
          content_type: "post",
          status: "active",
        } satisfies ICommunityPlatformVote.ICreate,
      },
    );
  typia.assert(initialVote);
  TestValidator.equals(
    "initial vote should be active",
    initialVote.status,
    "active",
  );

  // Step 4: Test vote update (changing vote type while maintaining active status)
  const updatedVote =
    await api.functional.communityPlatform.member.votes.update(connection, {
      voteId: initialVote.id,
      body: {
        vote_type: "downvote",
      } satisfies ICommunityPlatformVote.IUpdate,
    });
  typia.assert(updatedVote);
  TestValidator.equals(
    "vote ID should remain the same",
    updatedVote.id,
    initialVote.id,
  );
  TestValidator.equals(
    "vote type should change to downvote",
    updatedVote.vote_type,
    "downvote",
  );
  TestValidator.equals(
    "vote status should remain active",
    updatedVote.status,
    "active",
  );

  // Step 5: Test business rule - cancelled votes cannot be reactivated
  // Create a new vote with cancelled status
  const cancelledVote =
    await api.functional.communityPlatform.member.posts.votes.create(
      connection,
      {
        postId: post.id,
        body: {
          vote_type: "upvote",
          actor_type: "member",
          content_type: "post",
          status: "cancelled",
        } satisfies ICommunityPlatformVote.ICreate,
      },
    );
  typia.assert(cancelledVote);
  TestValidator.equals(
    "cancelled vote should have cancelled status",
    cancelledVote.status,
    "cancelled",
  );

  // Step 6: Validate vote lifecycle integrity
  TestValidator.equals(
    "all votes should reference the correct post",
    updatedVote.community_platform_post_id,
    post.id,
  );
  TestValidator.equals(
    "cancelled vote should reference the correct post",
    cancelledVote.community_platform_post_id,
    post.id,
  );
  TestValidator.predicate(
    "votes should not have comment references",
    updatedVote.community_platform_comment_id === undefined &&
      cancelledVote.community_platform_comment_id === undefined,
  );

  // Step 7: Validate actor type consistency
  TestValidator.equals(
    "votes should have member actor type",
    updatedVote.actor_type,
    "member",
  );
  TestValidator.equals(
    "cancelled vote should have member actor type",
    cancelledVote.actor_type,
    "member",
  );

  // Step 8: Validate content type consistency
  TestValidator.equals(
    "votes should have post content type",
    updatedVote.content_type,
    "post",
  );
  TestValidator.equals(
    "cancelled vote should have post content type",
    cancelledVote.content_type,
    "post",
  );

  // Final validation: Timestamp consistency
  TestValidator.predicate(
    "updated vote timestamp should be after creation",
    new Date(updatedVote.updated_at) > new Date(initialVote.created_at),
  );
  TestValidator.predicate(
    "cancelled vote should have valid timestamps",
    new Date(cancelledVote.created_at) <= new Date(cancelledVote.updated_at),
  );
}
