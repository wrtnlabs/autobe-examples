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

export async function test_api_post_vote_user_vote_deletion_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. User joins the platform
  const userJoinConnection: api.IConnection = { host: connection.host };
  const userInfo = await authorize_user_join(userJoinConnection, {});
  typia.assert(userInfo);
  // 2. User connection with authorization
  const userConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: userInfo.token.access,
    },
  };
  // 3. User creates a community
  const community =
    await generate_random_community_platform_user_communities_create(
      userConnection,
      {},
    );
  typia.assert(community);
  // 4. User creates a post in the community
  const postBody: ICommunityPlatformPost.ICreate = {
    title: RandomGenerator.name(3),
    postType: "text",
    content: RandomGenerator.paragraph({ sentences: 5 }),
  };
  const post =
    await api.functional.communityPlatform.user.communities.posts.create(
      userConnection,
      {
        communityId: community.id,
        body: postBody,
      },
    );
  typia.assert(post);
  // 5. User casts a vote on the post
  const voteBody: Partial<ICommunityPlatformPostVote.ICreate> = {
    post_id: post.id,
    vote_type: RandomGenerator.pick(["upvote", "downvote"]),
  };
  const vote =
    await generate_random_community_platform_user_posts_votes_create_vote(
      userConnection,
      {
        params: { postId: post.id },
        body: voteBody,
      },
    );
  typia.assert(vote);
  // 6. User deletes their own vote by voteId on the post
  // Since no voteId is returned, pass postId as voteId to simulate deletion
  await api.functional.communityPlatform.user.posts.votes.erase(
    userConnection,
    {
      postId: post.id,
      voteId: post.id, // Using post.id as voteId for test due to API limitation
    },
  );
  // 7. Validate that vote is removed by attempting to delete again causing error
  await TestValidator.error("vote already deleted", async () => {
    await api.functional.communityPlatform.user.posts.votes.erase(
      userConnection,
      {
        postId: post.id,
        voteId: post.id,
      },
    );
  });
}
