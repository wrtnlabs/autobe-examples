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
import { generate_random_community_platform_user_communities_create } from "../../../generate/generate_random_community_platform_user_communities_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_community_moderator } from "../../../prepare/prepare_random_community_platform_community_moderator";
import { prepare_random_community_platform_post_vote_of_moderator } from "../../../prepare/prepare_random_community_platform_post_vote_of_moderator";

export async function test_api_post_vote_update_moderator_reverse_vote_type(
  connection: api.IConnection,
): Promise<void> {
  // 1. Moderator registration and login
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderatorAuth = await authorize_moderator_join(moderatorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.name(1),
      displayName: null,
      bio: null,
      avatarUrl: null,
    },
  });
  typia.assert(moderatorAuth);
  moderatorConnection.headers ??= {};
  moderatorConnection.headers.Authorization = moderatorAuth.token.access;
  // 2. User registration and login (post creator)
  const userConnection: api.IConnection = { host: connection.host };
  const userAuth = await authorize_user_join(userConnection, {});
  typia.assert(userAuth);
  userConnection.headers ??= {};
  userConnection.headers.Authorization = userAuth.token.access;
  // 3. Create community by user
  const community =
    await generate_random_community_platform_user_communities_create(
      userConnection,
      {},
    );
  typia.assert(community);
  // 4. Assign moderator role to community
  const communityModerator =
    await generate_random_community_platform_moderator_communities_moderators_create_moderator(
      moderatorConnection,
      {
        params: { communityId: community.id },
        body: {
          communityModeratorId: moderatorAuth.id,
          role: "moderator",
        },
      },
    );
  typia.assert(communityModerator);
  // 5. Create post in community by user
  const post =
    await api.functional.communityPlatform.user.communities.posts.create(
      userConnection,
      {
        communityId: community.id,
        body: {
          title: RandomGenerator.name(3),
          postType: "text",
          content: RandomGenerator.paragraph({ sentences: 5 }),
        } satisfies ICommunityPlatformPost.ICreate,
      },
    );
  typia.assert(post);
  // 6. Create post vote entity - simulate initial vote as 'downvote' by moderator
  const initialModeratorVote =
    await generate_random_community_platform_moderator_post_votes_moderators_create(
      moderatorConnection,
      {
        body: {
          communityPlatformModeratorId: moderatorAuth.id,
          communityPlatformPostVoteId: typia.random<
            string & tags.Format<"uuid">
          >(),
          voteType: "downvote",
        },
      },
    );
  typia.assert(initialModeratorVote);
  // 7. Update moderator's post vote to 'upvote'
  const updatedVoteRaw =
    await api.functional.communityPlatform.moderator.postVotes.moderators.update(
      moderatorConnection,
      {
        postVoteId: initialModeratorVote.id,
        body: {
          vote_type: "upvote",
        },
      },
    );
  const updatedVote =
    typia.assert<ICommunityPlatformPostVoteOfModerator>(updatedVoteRaw);
  // 8. Validate vote_type updated correctly
  TestValidator.equals(
    "voteType updated to upvote",
    updatedVote.voteType,
    "upvote",
  );
  // 9. Validate moderator object exists in updated vote
  TestValidator.predicate(
    "moderator object exists",
    () => updatedVote.moderator !== null && updatedVote.moderator !== undefined,
  );
}
