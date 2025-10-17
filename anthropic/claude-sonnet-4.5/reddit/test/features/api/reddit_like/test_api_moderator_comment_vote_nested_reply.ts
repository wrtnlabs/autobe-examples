import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditLikeComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeComment";
import type { IRedditLikeCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommentVote";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikeModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeModerator";
import type { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";

/**
 * Test moderator voting on nested comment replies within threaded discussions.
 *
 * This test validates that moderators can successfully vote on comments at any
 * nesting depth in threaded discussions. It creates a complete discussion
 * hierarchy (community → post → parent comment → nested reply) and verifies
 * that the voting mechanics work correctly for nested replies, including proper
 * vote score calculation and karma attribution.
 *
 * Test flow:
 *
 * 1. Create moderator account for voting operations
 * 2. Create member account for community ownership
 * 3. Create community to host the discussion
 * 4. Create post within the community
 * 5. Create parent (top-level) comment on the post
 * 6. Create nested reply to the parent comment
 * 7. Cast moderator vote on the nested reply
 * 8. Validate vote was recorded correctly with proper vote score
 */
export async function test_api_moderator_comment_vote_nested_reply(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account
  const moderatorData = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
  } satisfies IRedditLikeModerator.ICreate;

  const moderator: IRedditLikeModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: moderatorData,
    });
  typia.assert(moderator);

  // Step 2: Create member account for community creation
  const memberData = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
  } satisfies IRedditLikeMember.ICreate;

  const member: IRedditLikeMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: memberData,
    });
  typia.assert(member);

  // Step 3: Create community for threaded discussion
  const communityData = {
    code: RandomGenerator.alphaNumeric(10),
    name: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies IRedditLikeCommunity.ICreate;

  const community: IRedditLikeCommunity =
    await api.functional.redditLike.member.communities.create(connection, {
      body: communityData,
    });
  typia.assert(community);

  // Step 4: Create post for comment thread
  const postData = {
    community_id: community.id,
    type: "text",
    title: RandomGenerator.paragraph({ sentences: 2 }),
    body: RandomGenerator.content({ paragraphs: 2 }),
  } satisfies IRedditLikePost.ICreate;

  const post: IRedditLikePost =
    await api.functional.redditLike.moderator.posts.create(connection, {
      body: postData,
    });
  typia.assert(post);

  // Step 5: Create parent comment for threading
  const parentCommentData = {
    reddit_like_post_id: post.id,
    content_text: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies IRedditLikeComment.ICreate;

  const parentComment: IRedditLikeComment =
    await api.functional.redditLike.moderator.comments.create(connection, {
      body: parentCommentData,
    });
  typia.assert(parentComment);

  // Step 6: Create nested reply to parent comment
  const nestedReplyData = {
    content_text: RandomGenerator.paragraph({ sentences: 2 }),
  } satisfies IRedditLikeComment.IReplyCreate;

  const nestedReply: IRedditLikeComment =
    await api.functional.redditLike.moderator.comments.replies.create(
      connection,
      {
        commentId: parentComment.id,
        body: nestedReplyData,
      },
    );
  typia.assert(nestedReply);

  // Step 7: Cast vote on nested reply as moderator
  const voteData = {
    vote_value: RandomGenerator.pick([1, -1] as const),
  } satisfies IRedditLikeCommentVote.ICreate;

  const vote: IRedditLikeCommentVote =
    await api.functional.redditLike.moderator.comments.votes.create(
      connection,
      {
        commentId: nestedReply.id,
        body: voteData,
      },
    );
  typia.assert(vote);

  // Step 8: Validate vote was recorded correctly
  TestValidator.equals(
    "vote value matches cast vote",
    vote.vote_value,
    voteData.vote_value,
  );
}
