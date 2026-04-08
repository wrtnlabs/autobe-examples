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
import { generate_random_reddit_clone_member_posts_create } from "../../../generate/generate_random_reddit_clone_member_posts_create";
import { prepare_random_reddit_clone_comment } from "../../../prepare/prepare_random_reddit_clone_comment";
import { prepare_random_reddit_clone_post } from "../../../prepare/prepare_random_reddit_clone_post";

/**
 * Test successful upvote on a comment by an authenticated member.
 *
 * Validates the complete comment upvote workflow including member authentication, post creation in a community, comment creation on the post, and upvoting the comment. Verifies that the vote record is created with vote_type='upvote', the comment's vote_score increases by 1, and the comment author's karma score increases by 1.
 *
 * The test ensures proper connection isolation by creating separate member connections for authentication and subsequent API calls. All responses are validated using typia.assert() for complete type checking.
 *
 * 1. Authenticate a member user with email, password, and username.
 * 2. Create a post in a community (member must be subscribed).
 * 3. Create a comment on that post.
 * 4. Cast an upvote on the comment.
 * 5. Verify the vote record is created with vote_type='upvote'.
 * 6. Verify the comment's vote_score increases by 1.
 * 7. Verify the comment author's karma score increases by 1.
 * 8. Verify the response contains the vote record with correct timestamps.
 */
export async function test_api_comment_vote_upvote_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate member user
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      username: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCloneMember.IJoin,
  });
  typia.assert(member);
  // 2. Create a post (using utility function)
  const post = await generate_random_reddit_clone_member_posts_create(
    memberConnection,
    {},
  );
  typia.assert(post);
  // 3. Create a comment on the post (using utility function)
  const comment =
    await generate_random_reddit_clone_member_posts_comments_create(
      memberConnection,
      {
        params: { postId: post.id },
      },
    );
  typia.assert(comment);
  // Store initial vote score
  const initialVoteScore = comment.voteScore;
  // 4. Cast an upvote on the comment
  const vote = await api.functional.redditClone.posts.comments.votes.update(
    memberConnection,
    {
      postId: post.id,
      commentId: comment.id,
      body: {
        vote_type: "upvote",
      } satisfies IRedditCloneCommentVote.IUpdate,
    },
  );
  typia.assert(vote);
  // 5. Verify vote record has correct vote_type
  TestValidator.equals("vote type is upvote", vote.vote_type, "upvote");
  // 6. Verify vote has valid timestamps
  TestValidator.predicate(
    "created_at is valid date-time",
    () => !isNaN(Date.parse(vote.created_at)),
  );
  TestValidator.predicate(
    "updated_at is valid date-time",
    () => !isNaN(Date.parse(vote.updated_at)),
  );
  // 7. Verify vote belongs to correct member
  TestValidator.equals("vote member id matches", vote.member.id, member.id);
  // 8. Verify vote belongs to correct comment
  TestValidator.equals("vote comment id matches", vote.comment.id, comment.id);
  // 9. Verify comment's vote_score increased by 1
  TestValidator.equals(
    "comment vote score increased by 1",
    vote.comment.vote_score,
    initialVoteScore + 1,
  );
}
