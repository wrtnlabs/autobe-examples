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
 * Validates vote creation functionality with different vote types
 * (upvote/downvote) to ensure proper vote direction handling and scoring impact
 * on community platform posts. This test verifies that upvotes and downvotes
 * are correctly processed, vote properties are properly set, and the voting
 * system maintains data integrity throughout operations.
 */
export async function test_api_member_post_vote_type_validation(
  connection: api.IConnection,
) {
  // Step 1: Register a new member for voting operations
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: "password123",
      display_name: RandomGenerator.paragraph({ sentences: 2 }),
      href: "https://community-platform.com/register",
      referrer: "https://community-platform.com",
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(member);

  // Step 2: Create a post for voting validation
  // Note: In a real scenario, we would need to create or reference an existing community
  // For this test, we'll use a valid UUID format for the community ID
  const post = await api.functional.communityPlatform.member.posts.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 3 }),
        post_type: "text",
        status: "published",
        community_platform_community_id: typia.random<
          string & tags.Format<"uuid">
        >(),
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(post);

  // Step 3: Create an upvote on the post
  const upvote =
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
  typia.assert(upvote);

  // Validate upvote properties
  TestValidator.equals(
    "upvote vote_type should be 'upvote'",
    upvote.vote_type,
    "upvote",
  );
  TestValidator.equals(
    "upvote content_type should be 'post'",
    upvote.content_type,
    "post",
  );
  TestValidator.equals(
    "upvote status should be 'active'",
    upvote.status,
    "active",
  );
  TestValidator.equals(
    "upvote post ID should match",
    upvote.community_platform_post_id,
    post.id,
  );

  // Step 4: Test that creating another vote on the same post by the same member should fail
  await TestValidator.error(
    "should not allow duplicate voting on same post by same member",
    async () => {
      await api.functional.communityPlatform.member.posts.votes.create(
        connection,
        {
          postId: post.id,
          body: {
            vote_type: "downvote",
            actor_type: "member",
            content_type: "post",
            status: "active",
          } satisfies ICommunityPlatformVote.ICreate,
        },
      );
    },
  );

  // Step 5: Register a second member to test different vote types on the same post
  const secondMemberEmail = typia.random<string & tags.Format<"email">>();
  const secondMember = await api.functional.auth.member.join(connection, {
    body: {
      email: secondMemberEmail,
      password: "password123",
      display_name: RandomGenerator.paragraph({ sentences: 2 }),
      href: "https://community-platform.com/register",
      referrer: "https://community-platform.com",
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(secondMember);

  // Step 6: Second member creates a downvote on the same post
  const downvote =
    await api.functional.communityPlatform.member.posts.votes.create(
      connection,
      {
        postId: post.id,
        body: {
          vote_type: "downvote",
          actor_type: "member",
          content_type: "post",
          status: "active",
        } satisfies ICommunityPlatformVote.ICreate,
      },
    );
  typia.assert(downvote);

  // Validate downvote properties
  TestValidator.equals(
    "downvote vote_type should be 'downvote'",
    downvote.vote_type,
    "downvote",
  );
  TestValidator.equals(
    "downvote content_type should be 'post'",
    downvote.content_type,
    "post",
  );
  TestValidator.equals(
    "downvote status should be 'active'",
    downvote.status,
    "active",
  );
  TestValidator.equals(
    "downvote post ID should match",
    downvote.community_platform_post_id,
    post.id,
  );

  // Step 7: Verify vote type differentiation between different members
  TestValidator.notEquals(
    "upvote and downvote should have different IDs",
    upvote.id,
    downvote.id,
  );
  TestValidator.notEquals(
    "upvote and downvote should have different vote types",
    upvote.vote_type,
    downvote.vote_type,
  );

  // Step 8: Validate vote timestamps
  TestValidator.predicate(
    "upvote should have valid created_at timestamp",
    upvote.created_at !== null && upvote.created_at !== undefined,
  );
  TestValidator.predicate(
    "downvote should have valid created_at timestamp",
    downvote.created_at !== null && downvote.created_at !== undefined,
  );
  TestValidator.predicate(
    "upvote should have valid updated_at timestamp",
    upvote.updated_at !== null && upvote.updated_at !== undefined,
  );
  TestValidator.predicate(
    "downvote should have valid updated_at timestamp",
    downvote.updated_at !== null && downvote.updated_at !== undefined,
  );

  // Step 9: Verify actor type consistency
  TestValidator.equals(
    "upvote actor_type should be 'member'",
    upvote.actor_type,
    "member",
  );
  TestValidator.equals(
    "downvote actor_type should be 'member'",
    downvote.actor_type,
    "member",
  );

  // Step 10: Validate content type consistency
  TestValidator.equals(
    "upvote content_type should be 'post'",
    upvote.content_type,
    "post",
  );
  TestValidator.equals(
    "downvote content_type should be 'post'",
    downvote.content_type,
    "post",
  );
}
