import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityBannedUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBannedUser";
import type { ICommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityCommunity";
import type { ICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMember";
import type { ICommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityModerator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityBannedUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityBannedUser";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";
import { generate_random_community_moderator_bans_create } from "../../../generate/generate_random_community_moderator_bans_create";
import { generate_random_community_moderator_communities_create } from "../../../generate/generate_random_community_moderator_communities_create";
import { prepare_random_community_banned_user } from "../../../prepare/prepare_random_community_banned_user";
import { prepare_random_community_community } from "../../../prepare/prepare_random_community_community";

export async function test_api_moderator_ban_search_filtered_by_time_range(
  connection: api.IConnection,
): Promise<void> {
  // Create moderator account
  const moderatorConnection: api.IConnection = { host: connection.host };
  await authorize_moderator_join(moderatorConnection, { body: {} });
  // Generate fake community_id since ICommunityCommunity has no 'id' property
  const communityId = typia.random<string & tags.Format<"uuid">>();
  // Generate a single UUID for the banned user (consistent for all bans)
  const bannedUserId = typia.random<string & tags.Format<"uuid">>();
  // Apply three bans with same community_id
  const ban1 = await generate_random_community_moderator_bans_create(
    moderatorConnection,
    {
      body: {
        community_id: communityId,
        banned_user_id: bannedUserId,
        reason: RandomGenerator.paragraph({ sentences: 1 }),
      } satisfies ICommunityBannedUser.ICreate,
    },
  );
  const ban1CreatedAt = ban1.created_at;
  const ban2 = await generate_random_community_moderator_bans_create(
    moderatorConnection,
    {
      body: {
        community_id: communityId,
        banned_user_id: bannedUserId,
        reason: RandomGenerator.paragraph({ sentences: 1 }),
      } satisfies ICommunityBannedUser.ICreate,
    },
  );
  const ban2CreatedAt = ban2.created_at;
  const ban3 = await generate_random_community_moderator_bans_create(
    moderatorConnection,
    {
      body: {
        community_id: communityId,
        banned_user_id: bannedUserId,
        reason: RandomGenerator.paragraph({ sentences: 1 }),
      } satisfies ICommunityBannedUser.ICreate,
    },
  );
  // Search for bans created between ban1's creation and ban2's creation
  const searchRequest: ICommunityBannedUser.IRequest = {
    community_id: communityId,
    created_at_after: ban1CreatedAt,
    created_at_before: ban2CreatedAt,
    page: 1,
    limit: 10,
  };
  const searchResponse = await api.functional.community.moderator.bans.index(
    moderatorConnection,
    {
      body: searchRequest,
    },
  );
  typia.assert(searchResponse);
  // Validate that exactly two bans are returned (ban1 and ban2)
  TestValidator.equals("returned bans count", searchResponse.data.length, 2);
  // Validate that bans are sorted by created_at ascending (default)
  TestValidator.predicate("bans sorted by created_at ascending", () => {
    return searchResponse.data.every((ban, index) => {
      if (index === 0) return true;
      const prevBan = searchResponse.data[index - 1];
      return (
        new Date(ban.created_at).getTime() >=
        new Date(prevBan.created_at).getTime()
      );
    });
  });
  // Verify that all bans are within the requested time range
  TestValidator.predicate("all bans within time range", () => {
    return searchResponse.data.every((ban) => {
      const banDate = new Date(ban.created_at);
      const startDate = new Date(ban1CreatedAt);
      const endDate = new Date(ban2CreatedAt);
      return banDate >= startDate && banDate <= endDate;
    });
  });
  // Verify that ban3 is not in the results (it was created after ban2)
  TestValidator.notEquals(
    "ban3 should not appear in results",
    searchResponse.data.find((ban) => ban.id === ban3.id),
    ban3,
  );
  // Also confirm ban3 created_at is after ban2CreatedAt
  TestValidator.predicate("ban3 created after search range", () => {
    return (
      new Date(ban3.created_at).getTime() > new Date(ban2CreatedAt).getTime()
    );
  });
}
