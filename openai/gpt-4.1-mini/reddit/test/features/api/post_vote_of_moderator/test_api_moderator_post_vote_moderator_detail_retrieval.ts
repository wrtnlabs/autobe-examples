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

export async function test_api_moderator_post_vote_moderator_detail_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // Scenario 1: Successfully retrieve detailed information about a moderator's vote on a post.
  // - Prerequisites: A community exists, a moderator is assigned to the community, a post is created in the community,
  //   a vote exists cast by the moderator on the post.
  // Create moderator and login
  const modJoinConnection: api.IConnection = { host: connection.host };
  const moderator = await authorize_moderator_join(modJoinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.name(),
      displayName: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 1 }),
      avatarUrl: "https://example.com/avatar.png",
    },
  });
  typia.assert(moderator);
  // Use moderator connection
  const modConnection: api.IConnection = { host: connection.host };
  modConnection.headers = { Authorization: moderator.token.access };
  // Create community by a user to assign the moderator later
  const userJoinConnection: api.IConnection = { host: connection.host };
  const user = await authorize_user_join(userJoinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      username: RandomGenerator.name(),
      displayName: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: null,
    },
  });
  typia.assert(user);
  const userConnection: api.IConnection = { host: connection.host };
  userConnection.headers = { Authorization: user.token.access };
  // Create community
  const community =
    await generate_random_community_platform_user_communities_create(
      userConnection,
      {
        body: {
          name: RandomGenerator.alphabets(8),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          iconUrl: "https://example.com/icon.png",
        },
      },
    );
  typia.assert(community);
  // Assign moderator role to the community
  const communityModerator =
    await generate_random_community_platform_moderator_communities_moderators_create_moderator(
      modConnection,
      {
        params: { communityId: community.id },
        body: {
          communityModeratorId: moderator.id,
          role: "moderator",
        },
      },
    );
  typia.assert(communityModerator);
  // Create post in community, typed specifically for 'text' post type
  const post =
    await api.functional.communityPlatform.user.communities.posts.create(
      userConnection,
      {
        communityId: community.id,
        body: {
          title: RandomGenerator.name(),
          postType: "text",
          content: RandomGenerator.paragraph({ sentences: 3 }),
        } as ICommunityPlatformPost.ICreate,
      },
    );
  typia.assert(post);
  // Moderator creates a vote on post
  const postVoteUncasted =
    await generate_random_community_platform_moderator_posts_votes_create_vote(
      modConnection,
      {
        params: { postId: post.id },
        body: {
          post_id: post.id,
          vote_type: "upvote",
        },
      },
    );
  // Cast postVote to type with 'id'
  const postVote = typia.assert<ICommunityPlatformPostVote & { id: string }>(postVoteUncasted);
  // Moderator casts a vote on the created post vote
  const postVoteOfModeratorUncasted =
    await generate_random_community_platform_moderator_post_votes_moderators_create(
      modConnection,
      {
        body: {
          communityPlatformModeratorId: moderator.id,
          communityPlatformPostVoteId: postVote.id,
          voteType: "upvote",
        },
      },
    );
  const postVoteOfModerator = typia.assert<ICommunityPlatformPostVoteOfModerator & { id: string }>(postVoteOfModeratorUncasted);
  // Retrieve moderator vote detail
  const fetchedUncasted =
    await api.functional.communityPlatform.moderator.postVotes.moderators.at(
      modConnection,
      {
        postVoteId: postVoteOfModerator.id,
      },
    );
  // Cast fetched to expected type with 'id' and 'moderator', 'postVote' with 'id'
  const fetched = typia.assert<
    ICommunityPlatformPostVoteOfModerator & {
      id: string;
      moderator: { id: string };
      postVote: { id: string };
    }
  >(fetchedUncasted);
  // Validate contents
  TestValidator.equals(
    "voteType",
    fetched.voteType,
    postVoteOfModerator.voteType,
  );
  TestValidator.equals("id", fetched.id, postVoteOfModerator.id);
  TestValidator.equals("moderator.id", fetched.moderator.id, moderator.id);
  TestValidator.equals("postVote.id", fetched.postVote.id, postVote.id);
  // Scenario 2: Authorization failure handling when unauthorized user attempts to fetch moderator post vote.
  // - Prerequisites: No authentication or authentication as a user without moderator role.
  // Unauthenticated connection
  const unauthConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError("unauthorized fetch", [401, 403], async () => {
    await api.functional.communityPlatform.moderator.postVotes.moderators.at(
      unauthConnection,
      {
        postVoteId: postVoteOfModerator.id,
      },
    );
  });
  // Authenticated user connection (not moderator)
  const authUserConnection: api.IConnection = { host: connection.host };
  authUserConnection.headers = { Authorization: user.token.access };
  await TestValidator.httpError("forbidden fetch", 403, async () => {
    await api.functional.communityPlatform.moderator.postVotes.moderators.at(
      authUserConnection,
      {
        postVoteId: postVoteOfModerator.id,
      },
    );
  });
  // Scenario 3: Handling not found when specified postVoteId does not exist.
  // - Prerequisites: Valid moderator authentication.
  await TestValidator.httpError("not found fetch", 404, async () => {
    await api.functional.communityPlatform.moderator.postVotes.moderators.at(
      modConnection,
      {
        postVoteId: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  });
}
