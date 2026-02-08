import api from "@ORGANIZATION/PROJECT-api";
import type { IConnection } from "@nestia/fetcher";
import { RandomGenerator, TestValidator } from "@nestia/e2e";
import typia from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { generate_random_community_platform_user_post_votes_create } from "../../../generate/generate_random_community_platform_user_post_votes_create";

export async function test_api_post_vote_create_downvote_authenticated_user(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register new user
  const userConnection: api.IConnection = { host: connection.host };
  const userAuthorized = await authorize_user_join(userConnection, {
    body: {},
  });
  userConnection.headers = {
    Authorization: `Bearer ${userAuthorized.token.access}`,
  };
  // 2. Create a new post in a subscribed community
  // Use typia.random to generate valid ICommunityPlatformPost.ICreate
  const postCreateBodyBase = typia.random<
    import("@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost").ICommunityPlatformPost.ICreate
  >();
  // Override some fields to ensure valid test data
  const postCreateBody: import("@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost").ICommunityPlatformPost.ICreate = {
    ...postCreateBodyBase,
    post_type: "text",
    title: RandomGenerator.name(3),
  };
  const createdPost = await api.functional.communityPlatform.user.posts.create(
    userConnection,
    {
      body: postCreateBody,
    },
  );
  typia.assert(createdPost);
  // 3. Cast downvote
  const voteCreateBody: import("@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostVote").ICommunityPlatformPostVote.ICreate = {
    post_id: "",
    vote_type: "downvote",
  };
  const createdVote =
    await generate_random_community_platform_user_post_votes_create(
      userConnection,
      {
        body: voteCreateBody,
      },
    );
  typia.assert(createdVote);
}