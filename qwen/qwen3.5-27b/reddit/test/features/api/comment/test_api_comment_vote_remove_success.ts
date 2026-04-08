import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneComment";
import type { IRedditCloneCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommentVote";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import type { IRedditClonePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePost";
import type { IRedditCloneUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_clone_member_posts_comments_create } from "../../../generate/generate_random_reddit_clone_member_posts_comments_create";
import { generate_random_reddit_clone_member_posts_comments_votes_create } from "../../../generate/generate_random_reddit_clone_member_posts_comments_votes_create";
import { generate_random_reddit_clone_member_posts_create } from "../../../generate/generate_random_reddit_clone_member_posts_create";
import { prepare_random_reddit_clone_comment } from "../../../prepare/prepare_random_reddit_clone_comment";
import { prepare_random_reddit_clone_comment_vote } from "../../../prepare/prepare_random_reddit_clone_comment_vote";
import { prepare_random_reddit_clone_post } from "../../../prepare/prepare_random_reddit_clone_post";

/**
 * Test that a member can remove their existing vote on a comment by submitting null as the vote type.
 *
 * Validates the complete comment vote removal flow including voter authentication, comment author setup, post creation, comment creation, initial vote casting, and vote removal. Ensures that removing a vote correctly adjusts the comment's vote score.
 *
 * Special attention is given to verifying that removing a downvote increases the vote score from -1 to 0, confirming the vote removal operation works correctly.
 *
 * 1. Authenticate as a voter member who will cast and remove the vote.
 * 2. Authenticate as a different member (comment author) and create a post.
 * 3. Create a comment on the post as the comment author.
 * 4. As the voter, cast a downvote on the comment (vote_score = -1).
 * 5. As the same voter, remove the vote by submitting vote_type = null.
 * 6. Verify the response returns the updated comment with vote_score = 0.
 */
export async function test_api_comment_vote_remove_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as voter
  const voterConnection: api.IConnection = { host: connection.host };
  const voter = await authorize_member_join(voterConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      username: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCloneMember.IJoin,
  });
  typia.assert(voter);
  // 2. Authenticate as comment author
  const authorConnection: api.IConnection = { host: connection.host };
  const author = await authorize_member_join(authorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      username: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCloneMember.IJoin,
  });
  typia.assert(author);
  // 3. Create a post as the author
  const post = await generate_random_reddit_clone_member_posts_create(
    authorConnection,
    {},
  );
  typia.assert(post);
  // 4. Create a comment on the post as the author
  const comment =
    await generate_random_reddit_clone_member_posts_comments_create(
      authorConnection,
      {
        params: { postId: post.id },
      },
    );
  typia.assert(comment);
  // 5. As the voter, cast a downvote on the comment
  const votedComment =
    await generate_random_reddit_clone_member_posts_comments_votes_create(
      voterConnection,
      {
        params: { postId: post.id, commentId: comment.id },
        body: {
          vote_type: "downvote",
        } satisfies IRedditCloneCommentVote.ICreate,
      },
    );
  typia.assert(votedComment);
  // Verify vote score is -1 after downvote
  TestValidator.equals("vote score after downvote", votedComment.voteScore, -1);
  // 6. As the same voter, remove the vote by submitting vote_type = null
  const removedComment =
    await generate_random_reddit_clone_member_posts_comments_votes_create(
      voterConnection,
      {
        params: { postId: post.id, commentId: comment.id },
        body: { vote_type: null } satisfies IRedditCloneCommentVote.ICreate,
      },
    );
  typia.assert(removedComment);
  // 7. Verify the response returns the updated comment with vote_score = 0
  TestValidator.equals("vote score after removal", removedComment.voteScore, 0);
}
