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

export async function test_api_comment_vote_change_upvote_to_downvote(
  connection: api.IConnection,
): Promise<void> {
  // Create voter connection
  const voterConnection: api.IConnection = { host: connection.host };
  const voter = await authorize_user_join(voterConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      username: RandomGenerator.alphabets(8),
    } satisfies ICommunityPlatformUser.IJoin,
  });
  typia.assert(voter);
  // Create comment author connection
  const authorConnection: api.IConnection = { host: connection.host };
  const author = await authorize_user_join(authorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      username: RandomGenerator.alphabets(8),
    } satisfies ICommunityPlatformUser.IJoin,
  });
  typia.assert(author);
  // Create community using author
  const community =
    await generate_random_community_platform_user_communities_create(
      authorConnection,
      {
        body: {
          name: RandomGenerator.alphabets(10),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  // Subscribe voter to community
  const subscription =
    await generate_random_community_platform_user_subscriptions_create(
      voterConnection,
      {
        body: {
          community_platform_community_id: community.id,
        } satisfies ICommunityPlatformCommunitySubscription.ICreate,
      },
    );
  typia.assert(subscription);
  // Create post using voter
  const post = await generate_random_community_platform_user_posts_create(
    voterConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        community_name: community.name,
        post_type: "text",
        text_content: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(post);
  // Create comment using author
  const comment =
    await generate_random_community_platform_user_posts_comments_create(
      authorConnection,
      {
        params: { postId: post.id },
        body: {
          content: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies ICommunityPlatformComment.ICreate,
      },
    );
  typia.assert(comment);
  // Record initial karma from the comment author
  const initialKarma = comment.author.karma;
  // Upvote the comment
  const upvotedComment =
    await api.functional.communityPlatform.user.comments.votes.patchByCommentid(
      voterConnection,
      {
        commentId: comment.id,
        body: {
          vote_type: "upvote",
        } satisfies ICommunityPlatformCommentVote.IRequest,
      },
    );
  typia.assert(upvotedComment);
  // Verify upvote results
  TestValidator.equals("vote score after upvote", upvotedComment.vote_score, 1);
  TestValidator.equals(
    "author karma after upvote",
    upvotedComment.author.karma,
    initialKarma + 1,
  );
  // Change vote to downvote
  const downvotedComment =
    await api.functional.communityPlatform.user.comments.votes.patchByCommentid(
      voterConnection,
      {
        commentId: comment.id,
        body: {
          vote_type: "downvote",
        } satisfies ICommunityPlatformCommentVote.IRequest,
      },
    );
  typia.assert(downvotedComment);
  // Verify downvote results
  TestValidator.equals(
    "vote score after downvote",
    downvotedComment.vote_score,
    -1,
  );
  TestValidator.equals(
    "author karma after downvote",
    downvotedComment.author.karma,
    initialKarma - 1,
  );
}
