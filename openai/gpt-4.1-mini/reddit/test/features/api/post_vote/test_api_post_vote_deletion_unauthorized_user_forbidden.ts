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
import { generate_random_community_platform_user_communities_create } from "../../../generate/generate_random_community_platform_user_communities_create";
import { generate_random_community_platform_user_posts_votes_create_vote } from "../../../generate/generate_random_community_platform_user_posts_votes_create_vote";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_post_vote } from "../../../prepare/prepare_random_community_platform_post_vote";

export async function test_api_post_vote_deletion_unauthorized_user_forbidden(
  connection: api.IConnection,
): Promise<void> {
  // This test verifies that a regular user (non-moderator) cannot delete a vote on a post, which is a moderator-only action.
  // 1. Register and authenticate as a regular user
  const userConnection: api.IConnection = { host: connection.host };
  const user = await authorize_user_join(userConnection, { body: {} });
  userConnection.headers = { Authorization: user.token.access };
  // 2. Create a community as the user
  const community =
    await generate_random_community_platform_user_communities_create(
      userConnection,
      { body: {} },
    );
  // 3. Create a post in the community as the user
  const postBody: ICommunityPlatformPost.ICreate = {
    title: "Sample Post for Vote",
    postType: "text",
    content: "This is a test post content.",
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
  // 4. Cast a vote on the post as the user (upvote)
  const voteBody: ICommunityPlatformPostVote.ICreate = {
    post_id: post.id,
    vote_type: "upvote",
  };
  const vote =
    await generate_random_community_platform_user_posts_votes_create_vote(
      userConnection,
      {
        body: voteBody,
        params: { postId: post.id },
      },
    );
  typia.assert(vote);
  // 5. Attempt to delete the vote as the unauthorized user (non-moderator)
  // Since voteId is required but not returned, use a random UUID
  const randomVoteId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "unauthorized user forbidden from deleting vote",
    403,
    async () => {
      await api.functional.communityPlatform.moderator.posts.votes.erase(
        userConnection,
        {
          postId: post.id,
          voteId: randomVoteId,
        },
      );
    },
  );
}
