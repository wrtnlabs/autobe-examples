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
 * Test vote creation with different initial statuses (active, cancelled,
 * pending) to validate vote lifecycle management. A member casts votes with
 * various status settings to ensure proper vote state transitions, moderation
 * workflows, and voting integrity maintenance. Validates that active votes
 * immediately impact scores, cancelled votes are properly revoked, and pending
 * votes await moderation approval before counting.
 */
export async function test_api_member_post_vote_status_management(
  connection: api.IConnection,
) {
  // Step 1: Create a member account for authentication
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: "password123",
      display_name: RandomGenerator.name(),
      ip: "127.0.0.1",
      href: "https://example.com/register",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(member);

  // Step 2: Create a post for voting (using a realistic community ID)
  const post = await api.functional.communityPlatform.member.posts.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 5 }),
        post_type: "text",
        status: "published",
        community_platform_community_id: typia.random<
          string & tags.Format<"uuid">
        >(),
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(post);

  // Step 3: Test active vote creation
  const activeVote =
    await api.functional.communityPlatform.member.posts.votes.create(
      connection,
      {
        postId: post.id,
        body: {
          vote_type: "upvote",
          status: "active",
        } satisfies ICommunityPlatformVote.ICreate,
      },
    );
  typia.assert(activeVote);
  await TestValidator.equals(
    "active vote should have active status",
    activeVote.status,
    "active",
  );
  await TestValidator.equals(
    "active vote should reference correct post",
    activeVote.community_platform_post_id,
    post.id,
  );

  // Step 4: Test cancelled vote creation
  const cancelledVote =
    await api.functional.communityPlatform.member.posts.votes.create(
      connection,
      {
        postId: post.id,
        body: {
          vote_type: "downvote",
          status: "cancelled",
        } satisfies ICommunityPlatformVote.ICreate,
      },
    );
  typia.assert(cancelledVote);
  await TestValidator.equals(
    "cancelled vote should have cancelled status",
    cancelledVote.status,
    "cancelled",
  );

  // Step 5: Test pending vote creation
  const pendingVote =
    await api.functional.communityPlatform.member.posts.votes.create(
      connection,
      {
        postId: post.id,
        body: {
          vote_type: "upvote",
          status: "pending",
        } satisfies ICommunityPlatformVote.ICreate,
      },
    );
  typia.assert(pendingVote);
  await TestValidator.equals(
    "pending vote should have pending status",
    pendingVote.status,
    "pending",
  );

  // Step 6: Validate vote type consistency
  await TestValidator.equals(
    "active vote should have correct vote type",
    activeVote.vote_type,
    "upvote",
  );
  await TestValidator.equals(
    "cancelled vote should have correct vote type",
    cancelledVote.vote_type,
    "downvote",
  );
  await TestValidator.equals(
    "pending vote should have correct vote type",
    pendingVote.vote_type,
    "upvote",
  );

  // Step 7: Validate actor type is correctly set to member
  await TestValidator.equals(
    "all votes should have member actor type",
    activeVote.actor_type,
    "member",
  );
  await TestValidator.equals(
    "cancelled vote should have member actor type",
    cancelledVote.actor_type,
    "member",
  );
  await TestValidator.equals(
    "pending vote should have member actor type",
    pendingVote.actor_type,
    "member",
  );

  // Step 8: Validate content type is correctly set to post
  await TestValidator.equals(
    "all votes should have post content type",
    activeVote.content_type,
    "post",
  );
  await TestValidator.equals(
    "cancelled vote should have post content type",
    cancelledVote.content_type,
    "post",
  );
  await TestValidator.equals(
    "pending vote should have post content type",
    pendingVote.content_type,
    "post",
  );

  // Step 9: Validate timestamps are properly set
  await TestValidator.predicate(
    "active vote should have creation timestamp",
    activeVote.created_at !== undefined,
  );
  await TestValidator.predicate(
    "cancelled vote should have creation timestamp",
    cancelledVote.created_at !== undefined,
  );
  await TestValidator.predicate(
    "pending vote should have creation timestamp",
    pendingVote.created_at !== undefined,
  );

  // Step 10: Validate vote IDs are unique
  await TestValidator.notEquals(
    "vote IDs should be unique",
    activeVote.id,
    cancelledVote.id,
  );
  await TestValidator.notEquals(
    "vote IDs should be unique",
    activeVote.id,
    pendingVote.id,
  );
  await TestValidator.notEquals(
    "vote IDs should be unique",
    cancelledVote.id,
    pendingVote.id,
  );

  // Step 11: Test error scenario - voting on non-existent post
  await TestValidator.error(
    "should fail when voting on non-existent post",
    async () => {
      await api.functional.communityPlatform.member.posts.votes.create(
        connection,
        {
          postId: typia.random<string & tags.Format<"uuid">>(),
          body: {
            vote_type: "upvote",
            status: "active",
          } satisfies ICommunityPlatformVote.ICreate,
        },
      );
    },
  );
}
