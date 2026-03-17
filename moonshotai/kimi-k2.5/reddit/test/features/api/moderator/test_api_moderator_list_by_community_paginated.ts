import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditLikeModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikeModerator";
import type { IRedditLikeAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeAttachment";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunitySubscription";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikeModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeModerator";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_like_member_communities_create } from "../../../generate/generate_random_reddit_like_member_communities_create";
import { prepare_random_reddit_like_community } from "../../../prepare/prepare_random_reddit_like_community";

/**
 * Test retrieving a paginated list of community moderators filtered by community ID.
 * Validates that an authenticated member can discover who holds moderation privileges
 * in a specific community. Tests pagination with page 1 and limit 20.
 */
export async function test_api_moderator_list_by_community_paginated(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create authenticated member connection
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {},
  });
  // 2. Create a community - member becomes owner and thus moderator
  const community = await generate_random_reddit_like_member_communities_create(
    memberConnection,
    { body: {} },
  );
  typia.assert(community);
  // 3. Subscribe to the created community
  await api.functional.redditLike.member.communities.subscriptions.create(
    memberConnection,
    {
      communityId: community.id,
    },
  );
  // 4. Retrieve paginated list of moderators for the specific community
  const paginatedResponse: IPageIRedditLikeModerator.ISummary =
    await api.functional.redditLike.moderators.index(memberConnection, {
      body: {
        communityId: community.id,
        page: 1,
        limit: 20,
      } satisfies IRedditLikeModerator.IRequest,
    });
  // 5. Validate complete response structure
  typia.assert(paginatedResponse);
  // 6. Validate results are scoped to the requested community
  const moderator = paginatedResponse.data[0];
  TestValidator.equals(
    "community matches filter",
    moderator.community.id,
    community.id,
  );
}
