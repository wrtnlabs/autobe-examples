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

import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";
import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_community_platform_moderator_posts_votes_create_vote } from "../../../generate/generate_random_community_platform_moderator_posts_votes_create_vote";
import { generate_random_community_platform_user_communities_create } from "../../../generate/generate_random_community_platform_user_communities_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_post_vote } from "../../../prepare/prepare_random_community_platform_post_vote";

export async function test_api_post_voting_remove_vote_by_moderator(
  connection: api.IConnection,
): Promise<void> {
  // 1. Prepare user actor connection and user join with known password
  const userJoinConnection: api.IConnection = { host: connection.host };
  const userPassword = "Password123!";
  const userJoinData: Partial<ICommunityPlatformUser.IJoin> = {
    password: userPassword,
  };
  const userAuthorized = await authorize_user_join(userJoinConnection, {
    body: userJoinData,
  });
  userJoinConnection.headers = { Authorization: userAuthorized.token.access };
  // 2. Prepare moderator actor connection and moderator join
  const modJoinConnection: api.IConnection = { host: connection.host };
  const moderatorAuthorized = await authorize_moderator_join(
    modJoinConnection,
    { body: {} },
  );
  modJoinConnection.headers = {
    Authorization: moderatorAuthorized.token.access,
  };
  // 3. Create a community by the user
  const userConnection: api.IConnection = {
    host: connection.host,
    headers: userJoinConnection.headers,
  };
  const community =
    await generate_random_community_platform_user_communities_create(
      userConnection,
      {},
    );
  typia.assert(community);
  // 4. Create a text post in that community authored by the user
  const postBody = {
    title: RandomGenerator.name(),
    postType: "text",
    content: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies ICommunityPlatformPost.ICreate;
  const post =
    await api.functional.communityPlatform.user.communities.posts.create(
      userConnection,
      {
        communityId: community.id,
        body: postBody,
      },
    );
  typia.assert(post);
  // 5. Moderator casts upvote on the post
  const moderatorConnection: api.IConnection = {
    host: connection.host,
    headers: modJoinConnection.headers,
  };
  const upvoteBody = {
    post_id: post.id,
    vote_type: "upvote",
  } satisfies ICommunityPlatformPostVote.ICreate;
  const upvoteResult =
    await generate_random_community_platform_moderator_posts_votes_create_vote(
      moderatorConnection,
      {
        params: { postId: post.id },
        body: upvoteBody,
      },
    );
  typia.assert(upvoteResult);
  // 6. Remove the vote by sending remove action
  const removeVoteBody = {
    post_id: post.id,
    vote_type: "remove",
  } satisfies ICommunityPlatformPostVote.ICreate;
  const removeVoteResult =
    await generate_random_community_platform_moderator_posts_votes_create_vote(
      moderatorConnection,
      {
        params: { postId: post.id },
        body: removeVoteBody,
      },
    );
  typia.assert(removeVoteResult);
  // 7. Assert votes are reset
  TestValidator.equals("upvotes after removal", removeVoteResult.upvotes, 0);
  TestValidator.equals(
    "downvotes after removal",
    removeVoteResult.downvotes,
    0,
  );
  // 8. Login the user again to check if karma decreased accordingly
  const userLoginConnection: api.IConnection = { host: connection.host };
  const userLoggedIn = await authorize_user_login(userLoginConnection, {
    body: {
      email: userAuthorized.email,
      password: userPassword,
    } satisfies ICommunityPlatformUser.ILogin,
  });
  typia.assert(userLoggedIn);
  TestValidator.predicate(
    "user karma decreased after vote removal",
    userLoggedIn.karma <= userAuthorized.karma - 1,
  );
}
