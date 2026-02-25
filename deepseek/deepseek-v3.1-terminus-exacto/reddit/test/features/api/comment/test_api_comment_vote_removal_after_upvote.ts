import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentVote";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunitySubscription";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_community_platform_user_communities_create } from "../../../generate/generate_random_community_platform_user_communities_create";
import { generate_random_community_platform_user_posts_comments_create } from "../../../generate/generate_random_community_platform_user_posts_comments_create";
import { generate_random_community_platform_user_posts_create } from "../../../generate/generate_random_community_platform_user_posts_create";
import { generate_random_community_platform_user_subscriptions_create } from "../../../generate/generate_random_community_platform_user_subscriptions_create";
import { prepare_random_community_platform_comment } from "../../../prepare/prepare_random_community_platform_comment";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_community_subscription } from "../../../prepare/prepare_random_community_platform_community_subscription";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";

/**
 * Test vote removal by setting vote type to 'none'. Setup creates comment, user votes upvote (vote recorded),
 * then removes vote by setting vote_type to 'none'. Verify comment score goes from 0 to +1 (after upvote)
 * then back to 0 (after removal), author karma returns to original (removing +1 impact), vote record is updated.
 * Validate vote removal affects karma correctly and supports democratic content evaluation system.
 */
export async function test_api_comment_vote_removal_after_upvote(
  connection: api.IConnection,
): Promise<void> {
  // Create user connection and authenticate
  const userConnection: api.IConnection = { host: connection.host };
  const user = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.alphaNumeric(12),
    } satisfies ICommunityPlatformUser.IJoin,
  });
  typia.assert(user);
  // Create community
  const community =
    await generate_random_community_platform_user_communities_create(
      userConnection,
      {
        body: {
          name: RandomGenerator.alphabets(10),
          description: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  // Subscribe to community
  const subscription =
    await generate_random_community_platform_user_subscriptions_create(
      userConnection,
      {
        body: {
          community_platform_community_id: community.id,
        } satisfies ICommunityPlatformCommunitySubscription.ICreate,
      },
    );
  typia.assert(subscription);
  // Create post
  const post = await generate_random_community_platform_user_posts_create(
    userConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        community_name: community.name,
        post_type: "text",
        text_content: RandomGenerator.paragraph({ sentences: 5 }),
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(post);
  // Create comment
  const comment =
    await generate_random_community_platform_user_posts_comments_create(
      userConnection,
      {
        params: { postId: post.id },
        body: {
          content: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies ICommunityPlatformComment.ICreate,
      },
    );
  typia.assert(comment);
  // Record initial karma and vote score
  const initialAuthorKarma = comment.author.karma;
  const initialVoteScore = comment.vote_score;
  TestValidator.equals("initial vote score should be 0", initialVoteScore, 0);
  // Upvote the comment
  const upvotedComment =
    await api.functional.communityPlatform.user.comments.votes.patchByCommentid(
      userConnection,
      {
        commentId: comment.id,
        body: {
          vote_type: "upvote",
        } satisfies ICommunityPlatformCommentVote.IRequest,
      },
    );
  typia.assert(upvotedComment);
  TestValidator.equals(
    "vote score after upvote should be +1",
    upvotedComment.vote_score,
    1,
  );
  TestValidator.equals(
    "author karma should increase by +1 after upvote",
    upvotedComment.author.karma,
    initialAuthorKarma + 1,
  );
  // Remove vote by setting vote_type to 'none'
  const removedVoteComment =
    await api.functional.communityPlatform.user.comments.votes.patchByCommentid(
      userConnection,
      {
        commentId: comment.id,
        body: {
          vote_type: "none",
        } satisfies ICommunityPlatformCommentVote.IRequest,
      },
    );
  typia.assert(removedVoteComment);
  TestValidator.equals(
    "vote score after removal should be 0",
    removedVoteComment.vote_score,
    0,
  );
  TestValidator.equals(
    "author karma should return to original after vote removal",
    removedVoteComment.author.karma,
    initialAuthorKarma,
  );
  // Validate democratic content evaluation system
  TestValidator.predicate(
    "vote removal supports democratic evaluation",
    removedVoteComment.vote_score === 0 &&
      removedVoteComment.author.karma === initialAuthorKarma,
  );
}
