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
 * Test that a member can successfully upvote a comment, increasing the comment's vote score and the author's karma.
 *
 * Validates the complete comment upvote workflow including authentication of two separate members (voter and comment author), post creation, comment creation, and upvote casting. Ensures that the upvote correctly increments the comment's vote score by 1 and the comment author's karma by 1.
 *
 * Special attention is given to verifying that the karma calculation correctly reflects the upvote, and that the vote score is properly maintained in the comment entity.
 *
 * 1. Authenticate as a voter member who will cast the upvote.
 * 2. Authenticate as a different member (comment author) and create a post in a community.
 * 3. Create a comment on the post as the comment author.
 * 4. Record the comment author's initial karma score before voting.
 * 5. As the voter, cast an upvote on the comment.
 * 6. Verify the response returns the updated comment with vote_score = 1.
 * 7. Verify the comment author's karma increased by 1 after the upvote.
 */
export async function test_api_comment_vote_upvote_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as voter member
  const voterConnection: api.IConnection = { host: connection.host };
  const voter = await authorize_member_join(voterConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      username: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCloneMember.IJoin,
  });
  typia.assert(voter);
  // 2. Authenticate as comment author member
  const authorConnection: api.IConnection = { host: connection.host };
  const author = await authorize_member_join(authorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      username: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCloneMember.IJoin,
  });
  typia.assert(author);
  // 3. Create a post as the comment author
  const post = await generate_random_reddit_clone_member_posts_create(
    authorConnection,
    {},
  );
  typia.assert(post);
  // 4. Create a comment on the post as the comment author
  const comment =
    await generate_random_reddit_clone_member_posts_comments_create(
      authorConnection,
      {
        params: { postId: post.id },
      },
    );
  typia.assert(comment);
  // 5. Record initial karma score from author's profile
  const initialKarma = author.karma;
  // 6. Cast upvote as the voter
  const upvotedComment =
    await generate_random_reddit_clone_member_posts_comments_votes_create(
      voterConnection,
      {
        params: { postId: post.id, commentId: comment.id },
        body: {
          vote_type: "upvote",
        } satisfies IRedditCloneCommentVote.ICreate,
      },
    );
  typia.assert(upvotedComment);
  // 7. Verify vote score is 1
  TestValidator.equals(
    "comment vote score after upvote",
    upvotedComment.voteScore,
    1,
  );
  // 8. Verify author's karma increased by 1 (from comment response author profile)
  TestValidator.equals(
    "author karma increased by 1 after upvote",
    upvotedComment.author.karma,
    initialKarma + 1,
  );
}
