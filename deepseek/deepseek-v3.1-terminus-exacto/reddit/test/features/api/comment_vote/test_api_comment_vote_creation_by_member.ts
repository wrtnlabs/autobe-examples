import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAuthorizationToken";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformVote";

/**
 * Test that authenticated members can successfully cast votes on comments,
 * validating the complete voting workflow from authentication to vote
 * creation.
 */
export async function test_api_comment_vote_creation_by_member(
  connection: api.IConnection,
) {
  // Step 1: Member authentication - register a new member
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "testPassword123";

  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      display_name: RandomGenerator.name(),
      href: "https://example.com/register",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(member);

  // Step 2: Create a mock post ID for comment creation
  // Since post creation API is not available, use a valid UUID format
  const mockPostId = typia.random<string & tags.Format<"uuid">>();

  // Step 3: Create a comment for voting
  const comment = await api.functional.communityPlatform.member.comments.create(
    connection,
    {
      body: {
        body: RandomGenerator.paragraph({ sentences: 3 }),
        community_platform_post_id: mockPostId,
      } satisfies ICommunityPlatformComment.ICreate,
    },
  );
  typia.assert(comment);

  // Step 4: Test upvote creation
  const upvote =
    await api.functional.communityPlatform.member.comments.votes.create(
      connection,
      {
        commentId: comment.id,
        body: {
          vote_type: "upvote",
        } satisfies ICommunityPlatformVote.ICreate,
      },
    );
  typia.assert(upvote);

  // Validate upvote attributes
  TestValidator.equals(
    "upvote type should be upvote",
    upvote.vote_type,
    "upvote",
  );
  TestValidator.equals(
    "actor type should be member",
    upvote.actor_type,
    "member",
  );
  TestValidator.equals(
    "content type should be comment",
    upvote.content_type,
    "comment",
  );
  TestValidator.equals("status should be active", upvote.status, "active");
  TestValidator.equals(
    "comment ID should match",
    upvote.community_platform_comment_id,
    comment.id,
  );

  // Step 5: Test downvote creation
  const downvote =
    await api.functional.communityPlatform.member.comments.votes.create(
      connection,
      {
        commentId: comment.id,
        body: {
          vote_type: "downvote",
        } satisfies ICommunityPlatformVote.ICreate,
      },
    );
  typia.assert(downvote);

  // Validate downvote attributes
  TestValidator.equals(
    "downvote type should be downvote",
    downvote.vote_type,
    "downvote",
  );
  TestValidator.equals(
    "actor type should be member",
    downvote.actor_type,
    "member",
  );
  TestValidator.equals(
    "content type should be comment",
    downvote.content_type,
    "comment",
  );
  TestValidator.equals("status should be active", downvote.status, "active");
  TestValidator.equals(
    "comment ID should match",
    downvote.community_platform_comment_id,
    comment.id,
  );

  // Step 6: Verify votes are distinct entities
  TestValidator.notEquals(
    "upvote and downvote should have different IDs",
    upvote.id,
    downvote.id,
  );
}
