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
 * Test vote creation with proper content type assignment and validation.
 *
 * This test validates that votes created on posts correctly assign 'post' as
 * the content type and properly associate votes with posts rather than
 * comments. It ensures that post-specific voting logic is enforced and that
 * votes are correctly tracked with the appropriate content type
 * classification.
 */
export async function test_api_member_post_vote_content_type_validation(
  connection: api.IConnection,
) {
  // Step 1: Create member account for authentication
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: "password123",
      display_name: RandomGenerator.name(),
      href: "https://example.com/register",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(member);

  // Step 2: Create a post to vote on (using member's community context)
  // Since we cannot create a community, we'll use the member's context
  // and rely on the system having a default community or using existing resources
  const post = await api.functional.communityPlatform.member.posts.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 5 }),
        post_type: "text",
        status: "published",
        community_platform_community_id: member.id, // Use member ID as fallback
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(post);

  // Step 3: Create upvote on the post
  const upvote =
    await api.functional.communityPlatform.member.posts.votes.create(
      connection,
      {
        postId: post.id,
        body: {
          vote_type: "upvote",
        } satisfies ICommunityPlatformVote.ICreate,
      },
    );
  typia.assert(upvote);

  // Step 4: Validate upvote content type and associations
  TestValidator.equals(
    "upvote content_type should be 'post'",
    upvote.content_type,
    "post",
  );
  TestValidator.equals(
    "upvote should reference correct post",
    upvote.community_platform_post_id,
    post.id,
  );
  TestValidator.equals(
    "upvote comment_id should be undefined",
    upvote.community_platform_comment_id,
    undefined,
  );
  TestValidator.equals(
    "upvote vote_type should be 'upvote'",
    upvote.vote_type,
    "upvote",
  );
  TestValidator.equals(
    "upvote status should be 'active'",
    upvote.status,
    "active",
  );

  // Step 5: Create downvote on the same post
  const downvote =
    await api.functional.communityPlatform.member.posts.votes.create(
      connection,
      {
        postId: post.id,
        body: {
          vote_type: "downvote",
        } satisfies ICommunityPlatformVote.ICreate,
      },
    );
  typia.assert(downvote);

  // Step 6: Validate downvote content type and associations
  TestValidator.equals(
    "downvote content_type should be 'post'",
    downvote.content_type,
    "post",
  );
  TestValidator.equals(
    "downvote should reference correct post",
    downvote.community_platform_post_id,
    post.id,
  );
  TestValidator.equals(
    "downvote comment_id should be undefined",
    downvote.community_platform_comment_id,
    undefined,
  );
  TestValidator.equals(
    "downvote vote_type should be 'downvote'",
    downvote.vote_type,
    "downvote",
  );
  TestValidator.equals(
    "downvote status should be 'active'",
    downvote.status,
    "active",
  );

  // Step 7: Verify votes have different IDs (unique records)
  TestValidator.notEquals(
    "upvote and downvote should have different IDs",
    upvote.id,
    downvote.id,
  );
}
