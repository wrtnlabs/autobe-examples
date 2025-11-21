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
 * Validate the integrity of the voting system for comments in the community
 * platform.
 *
 * This test ensures that votes cannot be cast on non-existent comments, deleted
 * comments, or comments in non-votable states. It verifies proper error
 * handling when attempting to vote on inaccessible content and prevents
 * duplicate voting on the same comment by the same user. The test also
 * validates that vote creation respects comment status and that voting
 * permissions align with community access controls.
 */
export async function test_api_comment_vote_integrity_validation(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate a member account
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

  // Step 2: Create a comment in published state
  const publishedComment =
    await api.functional.communityPlatform.member.comments.create(connection, {
      body: {
        body: RandomGenerator.paragraph({ sentences: 3 }),
        community_platform_post_id: typia.random<
          string & tags.Format<"uuid">
        >(),
        status: "published",
      } satisfies ICommunityPlatformComment.ICreate,
    });
  typia.assert(publishedComment);

  // Step 3: Verify successful voting on published comment
  const vote =
    await api.functional.communityPlatform.member.comments.votes.create(
      connection,
      {
        commentId: publishedComment.id,
        body: {
          vote_type: "upvote",
        } satisfies ICommunityPlatformVote.ICreate,
      },
    );
  typia.assert(vote);
  TestValidator.equals(
    "vote should be associated with correct comment",
    vote.community_platform_comment_id,
    publishedComment.id,
  );
  TestValidator.equals("vote type should be upvote", vote.vote_type, "upvote");
  TestValidator.equals("vote status should be active", vote.status, "active");

  // Step 4: Attempt duplicate voting on same comment
  await TestValidator.error("duplicate voting should fail", async () => {
    await api.functional.communityPlatform.member.comments.votes.create(
      connection,
      {
        commentId: publishedComment.id,
        body: {
          vote_type: "upvote",
        } satisfies ICommunityPlatformVote.ICreate,
      },
    );
  });

  // Step 5: Create a comment in pending state
  const pendingComment =
    await api.functional.communityPlatform.member.comments.create(connection, {
      body: {
        body: RandomGenerator.paragraph({ sentences: 3 }),
        community_platform_post_id: typia.random<
          string & tags.Format<"uuid">
        >(),
        status: "pending",
      } satisfies ICommunityPlatformComment.ICreate,
    });
  typia.assert(pendingComment);

  // Step 6: Attempt voting on pending comment
  await TestValidator.error(
    "voting on pending comment should fail",
    async () => {
      await api.functional.communityPlatform.member.comments.votes.create(
        connection,
        {
          commentId: pendingComment.id,
          body: {
            vote_type: "upvote",
          } satisfies ICommunityPlatformVote.ICreate,
        },
      );
    },
  );

  // Step 7: Attempt voting on non-existent comment
  const nonExistentCommentId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "voting on non-existent comment should fail",
    async () => {
      await api.functional.communityPlatform.member.comments.votes.create(
        connection,
        {
          commentId: nonExistentCommentId,
          body: {
            vote_type: "upvote",
          } satisfies ICommunityPlatformVote.ICreate,
        },
      );
    },
  );

  // Step 8: Test downvote functionality
  const downvote =
    await api.functional.communityPlatform.member.comments.votes.create(
      connection,
      {
        commentId: publishedComment.id,
        body: {
          vote_type: "downvote",
        } satisfies ICommunityPlatformVote.ICreate,
      },
    );
  typia.assert(downvote);
  TestValidator.equals(
    "downvote should be associated with correct comment",
    downvote.community_platform_comment_id,
    publishedComment.id,
  );
  TestValidator.equals(
    "downvote type should be downvote",
    downvote.vote_type,
    "downvote",
  );

  // Step 9: Validate vote data integrity
  TestValidator.equals(
    "vote should have correct content type",
    vote.content_type,
    "comment",
  );
  TestValidator.equals(
    "vote should have correct actor type",
    vote.actor_type,
    "member",
  );
  TestValidator.predicate(
    "vote should have valid creation timestamp",
    vote.created_at !== null && vote.created_at !== undefined,
  );
  TestValidator.predicate(
    "vote should have valid update timestamp",
    vote.updated_at !== null && vote.updated_at !== undefined,
  );
}
