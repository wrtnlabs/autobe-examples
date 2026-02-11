import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityBanOfMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityBanOfMember";
import type { IRedditCommunityBanOfMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityBanOfMember";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";
import type { IRedditCommunityCommunityOwner } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityOwner";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_community_moderator_join } from "../../../authorize/authorize_community_moderator_join";
import { authorize_community_moderator_login } from "../../../authorize/authorize_community_moderator_login";
import { authorize_community_moderator_refresh } from "../../../authorize/authorize_community_moderator_refresh";
import { authorize_community_owner_join } from "../../../authorize/authorize_community_owner_join";
import { authorize_community_owner_login } from "../../../authorize/authorize_community_owner_login";
import { authorize_community_owner_refresh } from "../../../authorize/authorize_community_owner_refresh";
import { generate_random_reddit_community_community_owner_communities_create } from "../../../generate/generate_random_reddit_community_community_owner_communities_create";
import { prepare_random_reddit_community_community } from "../../../prepare/prepare_random_reddit_community_community";

export async function test_api_community_owner_bans_filter_by_community_id(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create community owner account
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerData: IRedditCommunityCommunityOwner.IJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
  };
  await authorize_community_owner_join(ownerConnection, { body: ownerData });
  // 2. Login as community owner
  const loginOwnerConnection: api.IConnection = { host: connection.host };
  await authorize_community_owner_login(loginOwnerConnection, {
    body: {
      email: ownerData.email,
      password: ownerData.password,
    } satisfies IRedditCommunityCommunityOwner.ILogin,
  });
  // 3. Create a community as owner
  const communityConnection: api.IConnection = { host: connection.host };
  const communityName: string = RandomGenerator.alphaNumeric(8);
  const communityCreate: IRedditCommunityCommunity.ICreate = {
    name: communityName,
  };
  const createdCommunity: IRedditCommunityCommunity =
    await api.functional.redditCommunity.communityOwner.communities.create(
      communityConnection,
      { body: communityCreate },
    );
  typia.assert(createdCommunity);
  const communityId: string = createdCommunity.id;
  // 4. Test community-specific ban retrieval endpoint
  // This is the primary test: filter bans by community_id using community-specific endpoint
  const communityBanResponse: IPageIRedditCommunityBanOfMember.ISummary =
    await api.functional.redditCommunity.communityOwner.communities.bans.index(
      loginOwnerConnection,
      {
        communityId: communityId,
        body: {},
      },
    );
  typia.assert(communityBanResponse);
  // Validate response structure
  TestValidator.equals(
    "pagination has correct format",
    communityBanResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit is set",
    communityBanResponse.pagination.limit > 0,
    true,
  );
  TestValidator.predicate("data array exists", () =>
    Array.isArray(communityBanResponse.data),
  );
  TestValidator.predicate("each ban has required structure", () => {
    return communityBanResponse.data.every(
      (ban) =>
        ban.id &&
        ban.reason &&
        ban.created_at &&
        ban.moderator.id &&
        ban.moderator.display_name &&
        ban.community.id &&
        ban.community.name &&
        ban.banned_actor.id &&
        ban.banned_actor.display_name,
    );
  });
  // 5. Test global ban endpoint with community_id filter
  const globalBanFilter: IRedditCommunityBanOfMember.IRequest = {
    community_id: communityId,
  };
  const globalBanResponse: IPageIRedditCommunityBanOfMember.ISummary =
    await api.functional.redditCommunity.communityOwner.bans.index(
      loginOwnerConnection,
      { body: globalBanFilter },
    );
  typia.assert(globalBanResponse);
  // Confirm that if bans exist, they are in the same structured form
  TestValidator.predicate("global ban response has correct format", () => {
    return (
      globalBanResponse.pagination.current === 1 &&
      globalBanResponse.pagination.limit > 0 &&
      Array.isArray(globalBanResponse.data)
    );
  });
}
