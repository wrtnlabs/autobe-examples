import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModerator";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostVote";
import type { ICommunityPlatformPostVoteOfModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostVoteOfModerator";
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
import { generate_random_community_platform_moderator_communities_moderators_create_moderator } from "../../../generate/generate_random_community_platform_moderator_communities_moderators_create_moderator";
import { generate_random_community_platform_moderator_post_votes_moderators_create } from "../../../generate/generate_random_community_platform_moderator_post_votes_moderators_create";
import { generate_random_community_platform_moderator_posts_votes_create_vote } from "../../../generate/generate_random_community_platform_moderator_posts_votes_create_vote";
import { generate_random_community_platform_user_communities_create } from "../../../generate/generate_random_community_platform_user_communities_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_community_moderator } from "../../../prepare/prepare_random_community_platform_community_moderator";
import { prepare_random_community_platform_post_vote } from "../../../prepare/prepare_random_community_platform_post_vote";
import { prepare_random_community_platform_post_vote_of_moderator } from "../../../prepare/prepare_random_community_platform_post_vote_of_moderator";

export async function test_api_moderator_post_votes_moderators_create_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Moderator Join and Login
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderatorJoinResponse: ICommunityPlatformModerator.IAuthorized =
    await authorize_moderator_join(moderatorConnection, {
      body: {
        email: typia.random<string & typia.tags.Format<"email">>(),
        username: RandomGenerator.name(),
        displayName: RandomGenerator.name(),
        bio: RandomGenerator.paragraph({ sentences: 2 }),
        avatarUrl: null,
      },
    });
  typia.assert(moderatorJoinResponse);
  moderatorConnection.headers = {
    Authorization: moderatorJoinResponse.token.access,
  };
  // 2. User Join and Login (needed for community creation)
  const userConnection: api.IConnection = { host: connection.host };
  const userJoinResponse = await authorize_user_join(userConnection, {});
  typia.assert(userJoinResponse);
  userConnection.headers = {
    Authorization: userJoinResponse.token.access,
  };
  // 3. Create a community by the user
  const community =
    await generate_random_community_platform_user_communities_create(
      userConnection,
      {},
    );
  typia.assert(community);
  // 4. Assign moderator role to the community
  const communityModerator =
    await generate_random_community_platform_moderator_communities_moderators_create_moderator(
      moderatorConnection,
      {
        params: { communityId: community.id },
        body: {
          communityModeratorId: moderatorJoinResponse.id,
          role: "moderator",
        },
      },
    );
  typia.assert(communityModerator);
  // 5. Create a post in the community by the user
  // Use the user connection since posts are created by users
  const post =
    await api.functional.communityPlatform.user.communities.posts.create(
      userConnection,
      {
        communityId: community.id,
        body: {
          title: RandomGenerator.paragraph({ sentences: 1 }),
          postType: "text",
          content: RandomGenerator.paragraph({ sentences: 3 }),
        } as any,
      },
    );
  typia.assert(post);
  // 6. Create a post vote entity on the post by the moderator (through moderator posts votes API)
  let postVoteRaw =
    await generate_random_community_platform_moderator_posts_votes_create_vote(
      moderatorConnection,
      {
        params: { postId: post.id },
        body: {
          post_id: post.id,
          vote_type: "upvote",
        },
      },
    );
  // Assert and cast postVoteRaw to ICommunityPlatformPostVote with 'id'
  const postVote = typia.assert<ICommunityPlatformPostVote & { id: string }>(postVoteRaw);
  // 7. Moderator casts a vote on the post vote
  const moderatorPostVoteCreateInput: ICommunityPlatformPostVoteOfModerator.ICreate =
    {
      communityPlatformModeratorId: moderatorJoinResponse.id,
      communityPlatformPostVoteId: postVote.id,
      voteType: "upvote",
    };
  let moderatorPostVoteRaw =
    await generate_random_community_platform_moderator_post_votes_moderators_create(
      moderatorConnection,
      {
        body: moderatorPostVoteCreateInput,
      },
    );
  // Assert and cast moderatorPostVoteRaw to have proper moderator and postVote with 'id'
  const moderatorPostVote = typia.assert<
    ICommunityPlatformPostVoteOfModerator & {
      moderator: { id: string };
      postVote: { id: string };
    }
  >(moderatorPostVoteRaw);
  TestValidator.equals(
    "voteType is upvote",
    moderatorPostVote.voteType,
    moderatorPostVoteCreateInput.voteType,
  );
  TestValidator.equals(
    "moderator id matches",
    moderatorPostVote.moderator.id,
    moderatorJoinResponse.id,
  );
  TestValidator.equals(
    "postVote id matches",
    moderatorPostVote.postVote.id,
    postVote.id,
  );
}
