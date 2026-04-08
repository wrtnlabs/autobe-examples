import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditLikeComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeComment";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunitySubscription";
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
import { generate_random_reddit_like_member_communities_create } from "../../../generate/generate_random_reddit_like_member_communities_create";
import { generate_random_reddit_like_member_posts_create } from "../../../generate/generate_random_reddit_like_member_posts_create";
import { generate_random_reddit_like_member_posts_votes_create } from "../../../generate/generate_random_reddit_like_member_posts_votes_create";
import { generate_random_reddit_like_member_subscriptions_create } from "../../../generate/generate_random_reddit_like_member_subscriptions_create";
import { prepare_random_reddit_like_community } from "../../../prepare/prepare_random_reddit_like_community";
import { prepare_random_reddit_like_community_subscription } from "../../../prepare/prepare_random_reddit_like_community_subscription";
import { prepare_random_reddit_like_post } from "../../../prepare/prepare_random_reddit_like_post";
import { prepare_random_reddit_like_vote } from "../../../prepare/prepare_random_reddit_like_vote";

export async function test_api_post_vote_status_downvote(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account
  const memberConnection: api.IConnection = { host: connection.host };
  const member: IRedditLikeMember.IAuthorized = await authorize_member_join(
    memberConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        username: RandomGenerator.name(1),
        href: typia.random<string & tags.Format<"uri">>(),
      } satisfies IRedditLikeMember.IJoin,
    },
  );
  typia.assert(member);
  // 2. Create community
  const community: IRedditLikeCommunity =
    await generate_random_reddit_like_member_communities_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.name(2),
          description: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IRedditLikeCommunity.ICreate,
      },
    );
  typia.assert(community);
  // 3. Subscribe to community
  const subscription: IRedditLikeCommunitySubscription =
    await generate_random_reddit_like_member_subscriptions_create(
      memberConnection,
      {
        body: {
          communityId: community.id,
        } satisfies IRedditLikeCommunitySubscription.ICreate,
      },
    );
  typia.assert(subscription);
  // 4. Create post
  const post: IRedditLikePost =
    await generate_random_reddit_like_member_posts_create(memberConnection, {
      body: {
        community_id: community.id,
        title: RandomGenerator.paragraph({ sentences: 2 }),
        content_type: "text",
        content_text: RandomGenerator.content({ paragraphs: 2 }),
      } satisfies IRedditLikePost.ICreate,
    });
  typia.assert(post);
  // 5. Cast downvote
  const vote: IRedditLikeVote =
    await generate_random_reddit_like_member_posts_votes_create(
      memberConnection,
      {
        params: {
          postId: post.id,
        },
        body: {
          vote_type: "downvote",
        } satisfies IRedditLikeVote.ICreate,
      },
    );
  typia.assert(vote);
  // 6. Verify vote status
  const voteStatus: IRedditLikeVote | null =
    await api.functional.redditLike.member.posts.votes.at(memberConnection, {
      postId: post.id,
    });
  typia.assert(voteStatus);
  // Validate vote business logic
  TestValidator.equals(
    "vote type is downvote",
    voteStatus.vote_type,
    "downvote",
  );
  TestValidator.equals(
    "deleted_at is null (active vote)",
    voteStatus.deleted_at,
    null,
  );
}
