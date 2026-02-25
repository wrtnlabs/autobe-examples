import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityComment";
import type { ICommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityCommunity";
import type { ICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMember";
import type { ICommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPost";
import type { ICommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunitySubscription";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_member_communities_create } from "../../../generate/generate_random_community_member_communities_create";
import { generate_random_community_member_communities_posts_create } from "../../../generate/generate_random_community_member_communities_posts_create";
import { generate_random_community_member_posts_comments_create } from "../../../generate/generate_random_community_member_posts_comments_create";
import { prepare_random_community_comment } from "../../../prepare/prepare_random_community_comment";
import { prepare_random_community_community } from "../../../prepare/prepare_random_community_community";
import { prepare_random_community_post } from "../../../prepare/prepare_random_community_post";

/**
 * Test successful comment edit by the author.
 *
 * Validates that a comment author can update their own comment content,
 * and that the system properly handles whitespace stripping, timestamp updates,
 * and preserves vote metrics and relationships.
 */
export async function test_api_comment_update_by_author(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate as a member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  // Step 2: Create a community (creator becomes owner and auto-subscribed)
  const community = await generate_random_community_member_communities_create(
    memberConnection,
    {},
  );
  typia.assert(community);
  // Step 3: Create a text post in the community
  const post = await generate_random_community_member_communities_posts_create(
    memberConnection,
    {
      params: { communityName: community.name },
    },
  );
  typia.assert(post);
  // Step 4: Create a comment on the post with original content
  const originalContent = `Original comment content for testing ${RandomGenerator.alphaNumeric(8)}`;
  const comment = await generate_random_community_member_posts_comments_create(
    memberConnection,
    {
      params: { postId: post.id },
      body: { content: originalContent },
    },
  );
  typia.assert(comment);
  // Store original values for comparison
  const originalCreatedAt = comment.createdAt;
  const originalVoteScore = comment.voteScore;
  const originalUpvoteCount = comment.upvoteCount;
  const originalDownvoteCount = comment.downvoteCount;
  const originalAuthorId = comment.author.id;
  const originalPostId = comment.post.id;
  // Step 5: Edit the comment with whitespace to test stripping
  const updatedContent = `   Updated comment content ${RandomGenerator.alphaNumeric(8)}   `;
  const updatedComment = await api.functional.community.member.comments.update(
    memberConnection,
    {
      commentId: comment.id,
      body: { content: updatedContent } satisfies ICommunityComment.IUpdate,
    },
  );
  typia.assert(updatedComment);
  // Step 6: Validate the updated comment
  // Content should be trimmed (whitespace stripped)
  TestValidator.equals(
    "content should be trimmed",
    updatedComment.content,
    updatedContent.trim(),
  );
  // editedAt should be set (not null) indicating the comment was edited
  TestValidator.predicate(
    "editedAt should be set",
    updatedComment.editedAt !== null,
  );
  // editedAt should be recent (within the last few seconds)
  const editedTime = new Date(updatedComment.editedAt!).getTime();
  const now = Date.now();
  TestValidator.predicate(
    "editedAt should be recent",
    Math.abs(now - editedTime) < 10000,
  );
  // createdAt should be preserved from original
  TestValidator.equals(
    "createdAt should be preserved",
    updatedComment.createdAt,
    originalCreatedAt,
  );
  // updatedAt should be different from original (updated)
  TestValidator.predicate(
    "updatedAt should be updated",
    updatedComment.updatedAt !== comment.updatedAt,
  );
  // Vote metrics should remain unchanged
  TestValidator.equals(
    "vote score should be unchanged",
    updatedComment.voteScore,
    originalVoteScore,
  );
  TestValidator.equals(
    "upvote count should be unchanged",
    updatedComment.upvoteCount,
    originalUpvoteCount,
  );
  TestValidator.equals(
    "downvote count should be unchanged",
    updatedComment.downvoteCount,
    originalDownvoteCount,
  );
  // Author should be preserved
  TestValidator.equals(
    "author should be unchanged",
    updatedComment.author.id,
    originalAuthorId,
  );
  // Post relationship should be preserved
  TestValidator.equals(
    "post relationship should be unchanged",
    updatedComment.post.id,
    originalPostId,
  );
  // Comment should not be marked as deleted
  TestValidator.predicate(
    "comment should not be deleted",
    updatedComment.isDeleted === false,
  );
  // deletedAt should remain null
  TestValidator.predicate(
    "deletedAt should be null",
    updatedComment.deletedAt === null,
  );
}
