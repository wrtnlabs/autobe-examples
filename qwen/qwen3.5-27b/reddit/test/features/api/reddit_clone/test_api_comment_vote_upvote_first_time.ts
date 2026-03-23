import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneComment";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import type { IRedditClonePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePost";
import type { IRedditClonePostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostImage";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_clone_member_communities_create } from "../../../generate/generate_random_reddit_clone_member_communities_create";
import { generate_random_reddit_clone_member_posts_comments_create } from "../../../generate/generate_random_reddit_clone_member_posts_comments_create";
import { generate_random_reddit_clone_member_posts_create } from "../../../generate/generate_random_reddit_clone_member_posts_create";
import { prepare_random_reddit_clone_comment } from "../../../prepare/prepare_random_reddit_clone_comment";
import { prepare_random_reddit_clone_community } from "../../../prepare/prepare_random_reddit_clone_community";
import { prepare_random_reddit_clone_post } from "../../../prepare/prepare_random_reddit_clone_post";

/**
 * Test the primary success path of upvoting a comment for the first time.
 *
 * Setup:
 * 1. Register and authenticate as voter member
 * 2. Register and authenticate as comment author member
 * 3. Comment author creates a community
 * 4. Comment author creates a post in their community
 * 5. Comment author creates a comment on the post
 *
 * Execution:
 * 6. Voter casts an upvote (value=1) on the comment
 *
 * Validation:
 * - Response returns voteValue=1, commentScore=1, karmaChange=1
 * - Comment author's karma increases by 1
 * - Vote record is created in votes table
 * - Comment score updates from 0 to 1
 * - Response includes comment author summary with updated karma
 */
export async function test_api_comment_vote_upvote_first_time(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate voter member
  const voterConnection: api.IConnection = { host: connection.host };
  const voterAuth = await authorize_member_join(voterConnection, {});
  typia.assert(voterAuth);
  // 2. Register and authenticate comment author member
  const authorConnection: api.IConnection = { host: connection.host };
  const authorAuth = await authorize_member_join(authorConnection, {});
  typia.assert(authorAuth);
  // 3. Comment author creates a community
  const community =
    await generate_random_reddit_clone_member_communities_create(
      authorConnection,
      {},
    );
  typia.assert(community);
  // 4. Comment author creates a post in their community
  const post = await generate_random_reddit_clone_member_posts_create(
    authorConnection,
    {
      body: {
        communityId: community.id,
        title: RandomGenerator.paragraph({ sentences: 3 }),
        postType: "text",
        content: RandomGenerator.paragraph({ sentences: 5 }),
      },
    },
  );
  typia.assert(post);
  // 5. Comment author creates a comment on the post
  const comment =
    await generate_random_reddit_clone_member_posts_comments_create(
      authorConnection,
      {
        params: { postId: post.id },
        body: {
          content: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(comment);
  // 6. Voter casts an upvote (value=1) on the comment
  const voteResult =
    await api.functional.redditClone.member.posts.comments.vote(
      voterConnection,
      {
        postId: post.id,
        commentId: comment.id,
        body: {
          value: 1,
        } satisfies IRedditCloneComment.IVote,
      },
    );
  typia.assert(voteResult);
  // Validate vote result
  TestValidator.equals("vote value is 1", voteResult.voteValue, 1);
  TestValidator.equals("comment score is 1", voteResult.commentScore, 1);
  TestValidator.equals("karma change is 1", voteResult.karmaChange, 1);
  TestValidator.equals(
    "comment author matches",
    voteResult.commentAuthor.id,
    authorAuth.id,
  );
  TestValidator.predicate(
    "comment author karma increased",
    voteResult.commentAuthor.karma === 1,
  );
}