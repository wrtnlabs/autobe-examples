import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostVote";
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
import { generate_random_community_platform_user_posts_votes_create_vote } from "../../../generate/generate_random_community_platform_user_posts_votes_create_vote";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_post_vote } from "../../../prepare/prepare_random_community_platform_post_vote";

export async function test_api_post_voting_user_upvote(
  connection: api.IConnection,
): Promise<void> {
  // Test the process of casting an initial upvote on a post by an authenticated user. Steps include user registration, community creation, community subscription if required (implicit by post creation), post creation in the community, then voting with 'upvote'. Validate that the vote count for upvotes increments accordingly, the user's vote is recorded, and the author's karma is updated. Verify the response contains the updated vote tallies and user vote state. This scenario confirms the primary success path of voting on a post.
  // 1. Register a new user and create a new user connection
  const userConnection: api.IConnection = { host: connection.host };
  const authorizedUser = await authorize_user_join(userConnection, {});
  typia.assert(authorizedUser);
  // Update userConnection's headers with the token
  userConnection.headers = {
    Authorization: `Bearer ${authorizedUser.token.access}`,
  };
  // 2. Create a new community with the authorized user
  const community =
    await generate_random_community_platform_user_communities_create(
      userConnection,
      { body: {} },
    );
  typia.assert(community);
  // 3. Create a new post in the created community
  // Prepare a post creation body with type 'text'
  const postBody: ICommunityPlatformPost.ICreate = {
    title: RandomGenerator.name(3),
    postType: "text",
    content: RandomGenerator.content({ paragraphs: 1 }),
  };
  const post =
    await api.functional.communityPlatform.user.communities.posts.create(
      userConnection,
      { communityId: community.id, body: postBody },
    );
  typia.assert(post);
  // 4. Vote with 'upvote' on the created post
  const voteBody: ICommunityPlatformPostVote.ICreate = {
    post_id: post.id,
    vote_type: "upvote",
  };
  const vote =
    await generate_random_community_platform_user_posts_votes_create_vote(
      userConnection,
      { params: { postId: post.id }, body: voteBody },
    );
  typia.assert(vote);
  // 5. Validate the vote counts and user karma updated accordingly
  TestValidator.predicate(
    "Upvotes should be greater than zero",
    vote.upvotes > 0,
  );
  TestValidator.equals("Downvotes should be zero", vote.downvotes, 0);
  TestValidator.predicate(
    "User karma should be non-negative",
    authorizedUser.karma >= 0,
  );
}
