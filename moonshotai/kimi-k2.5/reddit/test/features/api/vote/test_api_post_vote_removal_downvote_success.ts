import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditLikeAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeAttachment";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunitySubscription";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";
import type { IRedditLikePostImageContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePostImageContent";
import type { IRedditLikePostLinkContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePostLinkContent";
import type { IRedditLikePostTextContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePostTextContent";
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
import { prepare_random_reddit_like_community } from "../../../prepare/prepare_random_reddit_like_community";
import { prepare_random_reddit_like_post } from "../../../prepare/prepare_random_reddit_like_post";
import { prepare_random_reddit_like_vote } from "../../../prepare/prepare_random_reddit_like_vote";

export async function test_api_post_vote_removal_downvote_success(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create post author connection and authenticate
  const authorConnection: api.IConnection = { host: connection.host };
  const author: IRedditLikeMember.IAuthorized = await authorize_member_join(
    authorConnection,
    {},
  );
  typia.assert(author);
  // Step 2: Create voter connection and authenticate (must be different from author)
  const voterConnection: api.IConnection = { host: connection.host };
  const voter: IRedditLikeMember.IAuthorized = await authorize_member_join(
    voterConnection,
    {},
  );
  typia.assert(voter);
  // Step 3: Create a community using author connection
  const community: IRedditLikeCommunity =
    await generate_random_reddit_like_member_communities_create(
      authorConnection,
      {},
    );
  typia.assert(community);
  // Step 4: Subscribe author to the community
  const authorSubscription: IRedditLikeCommunitySubscription =
    await api.functional.redditLike.member.communities.subscriptions.create(
      authorConnection,
      { communityId: community.id },
    );
  typia.assert(authorSubscription);
  // Step 5: Create a post using author connection
  const post: IRedditLikePost =
    await generate_random_reddit_like_member_posts_create(authorConnection, {
      body: {
        ...typia.random<IRedditLikePost.ICreate>(),
        community_id: community.id,
      },
    });
  typia.assert(post);
  // Step 6: Subscribe voter to the community
  const voterSubscription: IRedditLikeCommunitySubscription =
    await api.functional.redditLike.member.communities.subscriptions.create(
      voterConnection,
      { communityId: community.id },
    );
  typia.assert(voterSubscription);
  // Step 7: Cast a downvote on the post using voter connection
  const vote: IRedditLikeVote =
    await generate_random_reddit_like_member_posts_votes_create(
      voterConnection,
      {
        body: { vote_type: "downvote" },
        params: { postId: post.id },
      },
    );
  typia.assert(vote);
  TestValidator.equals("vote type is downvote", vote.vote_type, "downvote");
  // Step 8: Remove the downvote using DELETE endpoint
  await api.functional.redditLike.member.posts.my_vote.erase(voterConnection, {
    postId: post.id,
  });
  // The delete operation returns void on success, so successful completion indicates removal
  // Note: Verification of voteScore changes would require a POST GET endpoint that's not available
}
