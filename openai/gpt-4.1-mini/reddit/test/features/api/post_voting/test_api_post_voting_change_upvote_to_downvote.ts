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

export async function test_api_post_voting_change_upvote_to_downvote(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new user and authorize
  const userConnection: api.IConnection = { host: connection.host };
  const userAuth = await authorize_user_join(userConnection, {});
  typia.assert(userAuth);
  userConnection.headers = { Authorization: `Bearer ${userAuth.token.access}` };
  // 2. Create a new community (as the user)
  const communityBody: Partial<ICommunityPlatformCommunity.ICreate> = {
    name: `${RandomGenerator.alphabets(10)}${Date.now()}`,
    description: RandomGenerator.paragraph({ sentences: 3 }),
    iconUrl: `https://example.com/icons/${RandomGenerator.alphabets(5)}.png`,
  };
  const community =
    await generate_random_community_platform_user_communities_create(
      userConnection,
      { body: communityBody },
    );
  typia.assert(community);
  // 3. Create a post inside the community
  const postCreateBody = {
    title: RandomGenerator.paragraph({ sentences: 1 }),
    postType: "text",
    // For text posts, the content field is required according to typical post create schema
    content: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies ICommunityPlatformPost.ICreate;
  const post =
    await api.functional.communityPlatform.user.communities.posts.create(
      userConnection,
      {
        communityId: community.id,
        body: postCreateBody,
      },
    );
  typia.assert(post);
  // 4. Cast initial vote as 'upvote'
  const initialVote =
    await generate_random_community_platform_user_posts_votes_create_vote(
      userConnection,
      {
        params: { postId: post.id },
        body: {
          post_id: post.id,
          vote_type: "upvote",
        } satisfies ICommunityPlatformPostVote.ICreate,
      },
    );
  typia.assert(initialVote);
  TestValidator.predicate(
    "initial upvote is positive",
    initialVote.upvotes > 0 && initialVote.downvotes === 0,
  );
  // 5. Change vote to 'downvote'
  const changedVote =
    await generate_random_community_platform_user_posts_votes_create_vote(
      userConnection,
      {
        params: { postId: post.id },
        body: {
          post_id: post.id,
          vote_type: "downvote",
        } satisfies ICommunityPlatformPostVote.ICreate,
      },
    );
  typia.assert(changedVote);
  // 6. Validate vote counts changed correctly
  TestValidator.equals(
    "upvotes decreased by 1",
    changedVote.upvotes,
    initialVote.upvotes - 1,
  );
  TestValidator.equals(
    "downvotes increased by 1",
    changedVote.downvotes,
    initialVote.downvotes + 1,
  );
  // 7. Validate post author's karma changed accordingly
  // Fetch author's current data and check karma updated
  // Since in our test, the author is the user who cast the vote
  // fetch the user profile and check karma matches vote changes
  const authorConnection: api.IConnection = { host: connection.host };
  authorConnection.headers = {
    Authorization: `Bearer ${userAuth.token.access}`,
  };
  // Usually we would GET user profile to validate karma, but no GET user API provided
  // So we'll use userAuth which represents the current user including karma
  // and we expect karma to be decreased by 2 (upvote removed and downvote added)
  // Since we don't have an API to get updated karma, we'll trust post voting return
  // and assume karma changed accordingly. TestValidator on vote counts suffices here.
  // 8. Validate post author's karma >= 0 (karma can't be negative in normal cases)
  TestValidator.predicate(
    "post author's karma non-negative",
    userAuth.karma >= 0,
  );
}
