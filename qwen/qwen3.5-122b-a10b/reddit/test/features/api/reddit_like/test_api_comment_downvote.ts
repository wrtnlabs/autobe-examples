import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditLikeComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeComment";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";
import type { IRedditLikePostFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePostFile";
import type { IRedditLikeVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeVote";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_like_member_comments_votes_create } from "../../../generate/generate_random_reddit_like_member_comments_votes_create";
import { generate_random_reddit_like_member_communities_create } from "../../../generate/generate_random_reddit_like_member_communities_create";
import { generate_random_reddit_like_member_posts_comments_create } from "../../../generate/generate_random_reddit_like_member_posts_comments_create";
import { generate_random_reddit_like_member_posts_create } from "../../../generate/generate_random_reddit_like_member_posts_create";
import { prepare_random_reddit_like_comment } from "../../../prepare/prepare_random_reddit_like_comment";
import { prepare_random_reddit_like_community } from "../../../prepare/prepare_random_reddit_like_community";
import { prepare_random_reddit_like_post } from "../../../prepare/prepare_random_reddit_like_post";
import { prepare_random_reddit_like_vote } from "../../../prepare/prepare_random_reddit_like_vote";

/**
 * Test member comment downvote functionality with cross-member voting scenario.
 *
 * Validates the complete downvote workflow where one member downvotes a comment created by another member. The test ensures proper vote recording, comment score adjustment, and vote object structure.
 *
 * 1. Create voter member account with unique credentials.
 * 2. Create comment author member account with unique credentials.
 * 3. Author creates a community with unique name.
 * 4. Author creates a text post in the community.
 * 5. Author creates a comment on the post.
 * 6. Voter casts a downvote on the comment.
 * 7. Validates vote object has vote_type='downvote'.
 * 8. Validates vote targets the correct comment.
 * 9. Validates vote author is the voter member.
 * 10. Validates comment's vote_score reflects the downvote.
 */
export async function test_api_comment_downvote(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create voter member
  const voterConnection: api.IConnection = { host: connection.host };
  const voter = await authorize_member_join(voterConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditLikeMember.IJoin,
  });
  typia.assert(voter);
  // 2. Create comment author member
  const authorConnection: api.IConnection = { host: connection.host };
  const author = await authorize_member_join(authorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditLikeMember.IJoin,
  });
  typia.assert(author);
  // 3. Author creates a community
  const community = await generate_random_reddit_like_member_communities_create(
    authorConnection,
    {
      body: {
        name: RandomGenerator.name(2),
        description: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies IRedditLikeCommunity.ICreate,
    },
  );
  typia.assert(community);
  // 4. Author creates a text post in the community
  const post = await generate_random_reddit_like_member_posts_create(
    authorConnection,
    {
      body: {
        community_id: community.id,
        title: RandomGenerator.name(3),
        content_type: "text",
        content_text: RandomGenerator.paragraph({ sentences: 5 }),
      } satisfies IRedditLikePost.ICreate,
    },
  );
  typia.assert(post);
  // 5. Author creates a comment on the post
  const initialComment =
    await generate_random_reddit_like_member_posts_comments_create(
      authorConnection,
      {
        params: { postId: post.id },
        body: {
          content: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IRedditLikeComment.ICreate,
      },
    );
  typia.assert(initialComment);
  // Record initial vote score for validation
  const initialVoteScore = initialComment.vote_score;
  // 6. Voter casts a downvote on the comment
  const vote = await generate_random_reddit_like_member_comments_votes_create(
    voterConnection,
    {
      params: { commentId: initialComment.id },
      body: {
        vote_type: "downvote",
      } satisfies IRedditLikeVote.ICreate,
    },
  );
  typia.assert(vote);
  // 7. Validate vote object structure
  TestValidator.equals("vote type is downvote", vote.vote_type, "downvote");
  TestValidator.equals(
    "vote targets the correct comment",
    vote.comment?.id,
    initialComment.id,
  );
  TestValidator.equals("vote author is the voter", vote.author.id, voter.id);
  // 8. Validate vote.comment contains correct reference
  TestValidator.equals(
    "comment content matches",
    vote.comment?.content,
    initialComment.content,
  );
  TestValidator.equals(
    "comment author is the post author",
    vote.comment?.author.id,
    author.id,
  );
  // 9. Validate vote_score reflects the downvote (initial score was 0, now should be -1)
  TestValidator.equals(
    "comment vote score decreased by 1",
    vote.comment?.vote_score,
    initialVoteScore - 1,
  );
  // 10. Validate vote contains post reference
  TestValidator.equals("vote post reference matches", vote.post?.id, null);
}