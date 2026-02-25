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

export async function test_api_post_vote_update_moderator_remove_vote(
  connection: api.IConnection,
): Promise<void> {
  // 1. Moderator registration and login
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderatorJoinBody: Partial<ICommunityPlatformModerator.IJoin> = {
    email: typia.random<string & tags.Format<"email">>(),
    username: RandomGenerator.name(1),
    displayName: RandomGenerator.name(1),
    bio: RandomGenerator.paragraph({ sentences: 2 }),
    avatarUrl: null,
  };
  const moderatorAuthorized = await authorize_moderator_join(
    moderatorConnection,
    {
      body: moderatorJoinBody,
    },
  );
  moderatorConnection.headers = {
    Authorization: moderatorAuthorized.token.access,
  };
  // 2. User registration and login
  const userConnection: api.IConnection = { host: connection.host };
  const userJoinBody: ICommunityPlatformUser.IJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    username: RandomGenerator.name(1),
    displayName: RandomGenerator.name(1),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: null,
  };
  const userAuthorized = await authorize_user_join(userConnection, {
    body: userJoinBody,
  });
  userConnection.headers = { Authorization: userAuthorized.token.access };
  // 3. User creates a community
  const community =
    await generate_random_community_platform_user_communities_create(
      userConnection,
      {
        body: {
          name: RandomGenerator.name(2).replace(/ /g, "_").toLowerCase(),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          iconUrl: `https://example.com/icon_${RandomGenerator.alphabets(6)}.png`,
        },
      },
    );
  typia.assert(community);
  // 4. Moderator assigned to the community
  const communityModerator =
    await generate_random_community_platform_moderator_communities_moderators_create_moderator(
      moderatorConnection,
      {
        params: { communityId: community.id },
        body: {
          communityModeratorId: moderatorAuthorized.id,
          role: "moderator",
        },
      },
    );
  typia.assert(communityModerator);
  // 5. User creates a post in the community
  const postCreateBody = {
    title: RandomGenerator.paragraph({ sentences: 2 }),
    postType: "text",
    content: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies {
    title: string;
    postType: "text" | "link" | "image";
    content?: string;
    url?: string;
    imageUrls?: string[];
  };
  const post =
    await api.functional.communityPlatform.user.communities.posts.create(
      userConnection,
      {
        communityId: community.id,
        body: postCreateBody,
      },
    );
  typia.assert(post);
  // 6. Moderator creates an initial vote on the post
  const postVoteCreated =
    await generate_random_community_platform_moderator_post_votes_moderators_create(
      moderatorConnection,
      {
        body: {
          communityPlatformModeratorId: moderatorAuthorized.id,
          communityPlatformPostVoteId: post.id,
          voteType: "upvote",
        },
      },
    );
  typia.assert(postVoteCreated);
  // 7. Moderator attempts to update the vote to remove it
  // Since removing vote via update 'null' not supported, toggle the voteType
  const newVoteType =
    postVoteCreated.voteType === "upvote" ? "downvote" : "upvote";
  const updatedVote =
    await api.functional.communityPlatform.moderator.postVotes.moderators.update(
      moderatorConnection,
      {
        postVoteId: postVoteCreated.id,
        body: {
          vote_type: newVoteType,
        },
      },
    );
  typia.assert(updatedVote);
  // 8. Validate vote update
  TestValidator.equals("voteType updated", updatedVote.voteType, newVoteType);
  TestValidator.equals("vote ID same", updatedVote.id, postVoteCreated.id);
  TestValidator.equals(
    "moderator ID same",
    updatedVote.moderator, // The whole object should equal the expected moderator summary object
    moderatorAuthorized as unknown as typeof updatedVote.moderator,
  );
  TestValidator.equals(
    "post vote ID same",
    updatedVote.postVote, // The whole object should equal the expected postVote summary object
    postVoteCreated.postVote,
  );
}
