import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformComment";
import type { IRedditPlatformCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommentVote";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import type { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_platform_member_posts_comments_create } from "../../../generate/generate_random_reddit_platform_member_posts_comments_create";
import { generate_random_reddit_platform_member_posts_create } from "../../../generate/generate_random_reddit_platform_member_posts_create";
import { prepare_random_reddit_platform_comment } from "../../../prepare/prepare_random_reddit_platform_comment";
import { prepare_random_reddit_platform_post } from "../../../prepare/prepare_random_reddit_platform_post";

/**
 * Test comment vote lifecycle with score validation.
 * 1. Member joins the platform and logs in
 * 2. Member creates a post and comment
 * 3. Initial UPVOTE vote is created
 * 4. Vote is updated: UPVOTE -> DOWNVOTE -> NONE -> UPVOTE
 * 5. Comment vote score is verified after each update
 */
export async function test_api_member_comment_vote_lifecycle(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member registration and login
  const memberConnection: api.IConnection = { host: connection.host };
  const joinInput = {
    email: typia.random<string & typia.tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    username: RandomGenerator.name(),
    displayName: RandomGenerator.name(1),
  } satisfies IRedditPlatformMember.IJoin;
  const member = await api.functional.redditPlatform.auth.member.join(
    memberConnection,
    { body: joinInput },
  );
  typia.assert(member);
  // 2. Create a post
  const communityId = typia.random<string & typia.tags.Format<"uuid">>();
  const post = await api.functional.redditPlatform.member.posts.create(
    memberConnection,
    {
      body: {
        communityId,
        title: RandomGenerator.paragraph({ sentences: 2 }),
        type: "TEXT" as const,
        content: RandomGenerator.content({ paragraphs: 3 }),
      } satisfies IRedditPlatformPost.ICreate,
    },
  );
  typia.assert(post);
  // 3. Create a comment on the post
  const comment =
    await api.functional.redditPlatform.member.posts.comments.create(
      memberConnection,
      {
        postId: post.id,
        body: {
          content: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IRedditPlatformComment.ICreate,
      },
    );
  typia.assert(comment);
  // 4. Create initial UPVOTE vote
  const initialVote =
    await api.functional.redditPlatform.member.posts.comments.votes.updateVote(
      memberConnection,
      {
        postId: post.id,
        commentId: comment.id,
        body: {
          vote_type: "UPVOTE",
        } satisfies IRedditPlatformCommentVote.IUpdate,
      },
    );
  typia.assert(initialVote);
  TestValidator.equals("initial vote score", initialVote.vote_score, 1);
  // 5. Update vote from UPVOTE to DOWNVOTE
  const downVote =
    await api.functional.redditPlatform.member.posts.comments.votes.updateVote(
      memberConnection,
      {
        postId: post.id,
        commentId: comment.id,
        body: {
          vote_type: "DOWNVOTE",
        } satisfies IRedditPlatformCommentVote.IUpdate,
      },
    );
  typia.assert(downVote);
  TestValidator.equals("downvote score", downVote.vote_score, -1);
  // 6. Update vote from DOWNVOTE to NONE (remove vote)
  const removeVote =
    await api.functional.redditPlatform.member.posts.comments.votes.updateVote(
      memberConnection,
      {
        postId: post.id,
        commentId: comment.id,
        body: {
          vote_type: "NONE",
        } satisfies IRedditPlatformCommentVote.IUpdate,
      },
    );
  typia.assert(removeVote);
  TestValidator.equals("removed vote score", removeVote.vote_score, 0);
  // 7. Update vote from NONE to UPVOTE again
  const reUpVote =
    await api.functional.redditPlatform.member.posts.comments.votes.updateVote(
      memberConnection,
      {
        postId: post.id,
        commentId: comment.id,
        body: {
          vote_type: "UPVOTE",
        } satisfies IRedditPlatformCommentVote.IUpdate,
      },
    );
  typia.assert(reUpVote);
  TestValidator.equals("re-upvote score", reUpVote.vote_score, 1);
  // 8. Verify final comment state through vote record
  // Fetch the vote record to verify final state
  const finalVote =
    await api.functional.redditPlatform.member.posts.comments.votes.updateVote(
      memberConnection,
      {
        postId: post.id,
        commentId: comment.id,
        body: {
          vote_type: "UPVOTE",
        } satisfies IRedditPlatformCommentVote.IUpdate,
      },
    );
  typia.assert(finalVote);
  TestValidator.equals("final vote score", finalVote.vote_score, 1);
  TestValidator.equals(
    "final vote member matches",
    finalVote.member.id,
    member.id,
  );
  TestValidator.equals(
    "final vote comment matches",
    finalVote.comment.id,
    comment.id,
  );
}
