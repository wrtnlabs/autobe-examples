import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentVote";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostImage";
import type { ICommunityPlatformPostLinks } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostLinks";
import type { ICommunityPlatformPostTexts } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostTexts";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";

/**
 * Validate soft-deletion (undo) of a user's comment vote and the cascading
 * audit effects.
 *
 * End-to-end workflow:
 *
 * 1. Register and authenticate a new user.
 * 2. Create a community.
 * 3. Post a discussion.
 * 4. Add a comment as same user.
 * 5. Cast a vote (upvote) on the comment.
 * 6. Soft-delete (undo) that vote.
 * 7. Assert only the owner can delete and that deleted_at is set.
 * 8. Confirm comment vote record is not purged and deleted_at is non-null.
 */
export async function test_api_comment_vote_deletion_by_owner(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a user
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    display_name: RandomGenerator.name(),
    href: "https://test.com/register",
    referrer: "https://test.com/landing",
  } satisfies ICommunityPlatformUser.IJoin;
  const newUser = await api.functional.auth.user.join(connection, {
    body: joinBody,
  });
  typia.assert(newUser);

  // 2. Create a community
  const createCommunityBody = {
    name: RandomGenerator.alphabets(12),
    description: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies ICommunityPlatformCommunity.ICreate;
  const community =
    await api.functional.communityPlatform.user.communities.create(connection, {
      body: createCommunityBody,
    });
  typia.assert(community);

  // 3. Create a post
  const createPostBody = {
    community_id: community.id,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    text_body: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 3,
      sentenceMax: 6,
      wordMin: 3,
      wordMax: 10,
    }),
  } satisfies ICommunityPlatformPost.ICreate;
  const post = await api.functional.communityPlatform.user.posts.create(
    connection,
    { body: createPostBody },
  );
  typia.assert(post);

  // 4. Create a comment
  const createCommentBody = {
    post_id: post.id,
    body: RandomGenerator.paragraph({ sentences: 4 }),
  } satisfies ICommunityPlatformComment.ICreate;
  const comment = await api.functional.communityPlatform.user.comments.create(
    connection,
    { body: createCommentBody },
  );
  typia.assert(comment);

  // 5. Cast a vote (upvote)
  const voteBody = {
    community_platform_comment_id: comment.id,
    is_upvote: true,
  } satisfies ICommunityPlatformCommentVote.ICreate;
  const vote = await api.functional.communityPlatform.user.commentVotes.create(
    connection,
    { body: voteBody },
  );
  typia.assert(vote);

  // 6. Soft-delete (undo) the vote
  const deletedVote =
    await api.functional.communityPlatform.user.commentVotes.erase(connection, {
      commentVoteId: vote.id,
    });
  typia.assert(deletedVote);

  // 7. Assert the owner is able to delete and that deleted_at is set
  TestValidator.predicate(
    "vote must have deleted_at timestamp after undo",
    deletedVote.deleted_at !== null && deletedVote.deleted_at !== undefined,
  );
  TestValidator.equals(
    "deleted vote record id must match original vote id",
    deletedVote.id,
    vote.id,
  );
  TestValidator.equals(
    "deleted_at timestamp set on vote owner delete",
    typeof deletedVote.deleted_at,
    "string",
  );

  // 8. Confirm comment vote record is not purged (fields still exist)
  TestValidator.equals(
    "community_platform_comment_id unchanged after vote deletion",
    deletedVote.community_platform_comment_id,
    vote.community_platform_comment_id,
  );
  TestValidator.equals(
    "deleted vote audit still retains original user id",
    deletedVote.community_platform_user_id,
    vote.community_platform_user_id,
  );
}
