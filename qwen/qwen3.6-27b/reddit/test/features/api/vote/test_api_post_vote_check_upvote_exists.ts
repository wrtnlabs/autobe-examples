import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IREdditLikeCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityCommunity";
import type { IREdditLikeCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityMember";
import type { IREdditLikeCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityPost";
import type { IREdditLikeCommunityProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityProfile";
import type { IRedditLikeCommunityCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunityCommunitySubscription";
import type { IRedditLikeCommunityPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunityPostImage";
import type { IRedditLikeCommunityPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunityPostVote";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_like_community_member_communities_create } from "../../../generate/generate_random_reddit_like_community_member_communities_create";
import { generate_random_reddit_like_community_member_community_subscriptions_create } from "../../../generate/generate_random_reddit_like_community_member_community_subscriptions_create";
import { generate_random_reddit_like_community_member_posts_create } from "../../../generate/generate_random_reddit_like_community_member_posts_create";
import { generate_random_reddit_like_community_member_posts_votes_create } from "../../../generate/generate_random_reddit_like_community_member_posts_votes_create";
import { prepare_random_reddit_like_community_community } from "../../../prepare/prepare_random_reddit_like_community_community";
import { prepare_random_reddit_like_community_community_subscription } from "../../../prepare/prepare_random_reddit_like_community_community_subscription";
import { prepare_random_reddit_like_community_post } from "../../../prepare/prepare_random_reddit_like_community_post";
import { prepare_random_reddit_like_community_post_vote } from "../../../prepare/prepare_random_reddit_like_community_post_vote";

export async function test_api_post_vote_check_upvote_exists(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a new member
  const memberConnection: api.IConnection = { host: connection.host };
  const authorizedMember: IREdditLikeCommunityMember.IAuthorized =
    await authorize_member_join(memberConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        username: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IREdditLikeCommunityMember.IJoin,
    });
  typia.assert(authorizedMember);
  // 2. Create a community
  const community: IREdditLikeCommunityCommunity =
    await generate_random_reddit_like_community_member_communities_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies DeepPartial<IREdditLikeCommunityCommunity.ICreate>,
      },
    );
  typia.assert(community);
  // 3. Subscribe to the community
  const subscription: IRedditLikeCommunityCommunitySubscription =
    await generate_random_reddit_like_community_member_community_subscriptions_create(
      memberConnection,
      {
        body: {
          community_id: community.id,
        } satisfies DeepPartial<IRedditLikeCommunityCommunitySubscription.ICreate>,
      },
    );
  typia.assert(subscription);
  // 4. Create a post in the community
  const post: IREdditLikeCommunityPost =
    await generate_random_reddit_like_community_member_posts_create(
      memberConnection,
      {
        body: {
          title: RandomGenerator.paragraph({ sentences: 2 }),
          post_type: "text",
          community_id: community.id,
          body: RandomGenerator.paragraph({ sentences: 5 }),
        } satisfies DeepPartial<IREdditLikeCommunityPost.ICreate>,
      },
    );
  typia.assert(post);
  // 5. Cast an upvote on the post
  const vote: IRedditLikeCommunityPostVote =
    await generate_random_reddit_like_community_member_posts_votes_create(
      memberConnection,
      {
        body: {
          direction: "up",
        } satisfies DeepPartial<IRedditLikeCommunityPostVote.ICreate>,
        params: {
          postId: post.id,
        },
      },
    );
  typia.assert(vote);
  // 6. Check the vote status
  const checkedVote =
    await api.functional.redditLikeCommunity.member.votes.posts.check(
      memberConnection,
      {
        postId: post.id,
      },
    );
  typia.assert(checkedVote);
  // 7. Validate the response
  TestValidator.equals(
    "vote direction matches",
    checkedVote.direction,
    vote.direction,
  );
  TestValidator.equals(
    "author matches",
    checkedVote.author.id,
    authorizedMember.id,
  );
  TestValidator.equals("post matches", checkedVote.post.id, post.id);
  TestValidator.predicate(
    "created_at is populated",
    checkedVote.created_at !== undefined,
  );
  TestValidator.predicate(
    "updated_at is populated",
    checkedVote.updated_at !== undefined,
  );
}
