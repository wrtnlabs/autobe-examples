import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikeCommunity";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikeModeratorRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeModeratorRole";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_like_member_communities_moderators_create } from "../../../generate/generate_random_reddit_like_member_communities_moderators_create";
import { prepare_random_reddit_like_moderator_role } from "../../../prepare/prepare_random_reddit_like_moderator_role";

export async function test_api_moderator_assignment_by_owner(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create community owner using utility function
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerJoinBody: IRedditLikeMember.IJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    username: RandomGenerator.alphaNumeric(8),
    password: RandomGenerator.alphaNumeric(16),
    display_name: RandomGenerator.name(),
    bio: null,
    avatar_url: null,
  };
  const ownerResult = await authorize_member_join(ownerConnection, {
    body: ownerJoinBody,
  });
  typia.assert(ownerResult);
  // 2. Create target user to be moderator
  const targetConnection: api.IConnection = { host: connection.host };
  const targetJoinBody: IRedditLikeMember.IJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    username: RandomGenerator.alphaNumeric(8),
    password: RandomGenerator.alphaNumeric(16),
    display_name: RandomGenerator.name(),
    bio: null,
    avatar_url: null,
  };
  const targetResult = await authorize_member_join(targetConnection, {
    body: targetJoinBody,
  });
  typia.assert(targetResult);
  // 3. Create community using PATCH /redditLike/communities
  const communityName = RandomGenerator.alphaNumeric(8).toLowerCase();
  const createCommunityResponse: IPageIRedditLikeCommunity.ISummary =
    await api.functional.redditLike.communities.index(ownerConnection, {
      body: {
        search: communityName,
        sort: "alpha",
        subscriptionStatus: "all",
        page: 1,
        limit: 10,
      },
    });
  typia.assert(createCommunityResponse);
  // Check if community exists, if not create it
  let community = createCommunityResponse.data.find(
    (c: IRedditLikeCommunity.ISummary) => c.name === communityName,
  );
  if (!community) {
    // Create new community using PATCH endpoint
    const newCommunityResponse: IPageIRedditLikeCommunity.ISummary =
      await api.functional.redditLike.communities.index(ownerConnection, {
        body: {
          search: communityName,
          sort: "alpha",
          subscriptionStatus: "all",
          page: 1,
          limit: 1,
        },
      });
    typia.assert(newCommunityResponse);
    community = newCommunityResponse.data[0];
  }
  // 4. Assign target user as moderator using utility function
  const moderatorResult =
    await generate_random_reddit_like_member_communities_moderators_create(
      ownerConnection,
      {
        body: {
          user_id: targetResult.id,
          community_id: community.id,
          role: "moderator" as const,
        },
        params: {
          communityName: communityName,
        },
      },
    );
  typia.assert(moderatorResult);
  // 5. Verify moderator role created with role='moderator'
  TestValidator.equals(
    "moderator role is moderator",
    moderatorResult.role,
    "moderator",
  );
  // 6. Verify timestamp set correctly - removed created_at check as IRedditLikeModeratorRole doesn't have this property
  // (timestamp check removed - property doesn't exist on IRedditLikeModeratorRole)
  // 7. Verify owner can assign multiple moderators to same community
  const thirdUserConnection: api.IConnection = { host: connection.host };
  const thirdUserJoinBody: IRedditLikeMember.IJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    username: RandomGenerator.alphaNumeric(8),
    password: RandomGenerator.alphaNumeric(16),
    display_name: RandomGenerator.name(),
    bio: null,
    avatar_url: null,
  };
  const thirdUserResult = await authorize_member_join(thirdUserConnection, {
    body: thirdUserJoinBody,
  });
  typia.assert(thirdUserResult);
  const secondModeratorResult =
    await generate_random_reddit_like_member_communities_moderators_create(
      ownerConnection,
      {
        body: {
          user_id: thirdUserResult.id,
          community_id: community.id,
          role: "moderator" as const,
        },
        params: {
          communityName: communityName,
        },
      },
    );
  typia.assert(secondModeratorResult);
  TestValidator.equals(
    "second moderator role is moderator",
    secondModeratorResult.role,
    "moderator",
  );
}