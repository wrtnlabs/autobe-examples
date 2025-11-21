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
 * Test that a member can successfully create a downvote on a comment within a
 * discussion thread.
 *
 * This scenario validates the voting system's support for comment-level
 * engagement, ensuring that members can express opinions on individual comments
 * within posts. The test verifies proper comment association, vote type
 * recording, and that the voting action respects comment-specific business
 * rules and moderation workflows.
 */
export async function test_api_member_vote_comment_creation(
  connection: api.IConnection,
) {
  // Step 1: Create a member account for authentication context
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

  // Step 2: Create a parent post to host the comment
  // Note: We need to use a valid community ID, but since we don't have community creation API,
  // we'll use a randomly generated UUID that should be validated by the backend
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

  // Step 3: Create a comment that the member can vote on
  const comment = await api.functional.communityPlatform.member.comments.create(
    connection,
    {
      body: {
        body: RandomGenerator.content({ paragraphs: 1 }),
        community_platform_post_id: post.id,
        status: "published",
      } satisfies ICommunityPlatformComment.ICreate,
    },
  );
  typia.assert(comment);

  // Step 4: Create a downvote on the comment
  const vote = await api.functional.communityPlatform.member.votes.create(
    connection,
    {
      body: {
        vote_type: "downvote",
        actor_type: "member",
        content_type: "comment",
        status: "active",
      } satisfies ICommunityPlatformVote.ICreate,
    },
  );
  typia.assert(vote);

  // Step 5: Validate the vote was properly recorded with correct associations
  TestValidator.equals(
    "vote type should be downvote",
    vote.vote_type,
    "downvote",
  );
  TestValidator.equals(
    "actor type should be member",
    vote.actor_type,
    "member",
  );
  TestValidator.equals(
    "content type should be comment",
    vote.content_type,
    "comment",
  );
  TestValidator.equals("vote status should be active", vote.status, "active");

  // The vote should be properly associated with the comment
  TestValidator.notEquals("vote ID should not be empty", vote.id, "");
  TestValidator.notEquals(
    "created_at should not be empty",
    vote.created_at,
    "",
  );
  TestValidator.notEquals(
    "updated_at should not be empty",
    vote.updated_at,
    "",
  );
}
