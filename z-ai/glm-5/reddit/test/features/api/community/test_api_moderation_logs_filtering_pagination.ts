import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBan";
import type { ICommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityComment";
import type { ICommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityCommunity";
import type { ICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMember";
import type { ICommunityModerationLog } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityModerationLog";
import type { ICommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityModerator";
import type { ICommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPost";
import type { ICommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunitySubscription";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityModerationLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityModerationLog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_member_communities_bans_create } from "../../../generate/generate_random_community_member_communities_bans_create";
import { generate_random_community_member_communities_create } from "../../../generate/generate_random_community_member_communities_create";
import { generate_random_community_member_communities_moderators_create } from "../../../generate/generate_random_community_member_communities_moderators_create";
import { prepare_random_community_ban } from "../../../prepare/prepare_random_community_ban";
import { prepare_random_community_community } from "../../../prepare/prepare_random_community_community";
import { prepare_random_community_moderator } from "../../../prepare/prepare_random_community_moderator";

/**
 * Test that an appointed moderator (non-owner) can access moderation logs with filtering capabilities.
 * A community owner creates a community, appoints a moderator, then that moderator performs moderation actions (bans a user).
 * The moderator queries the logs endpoint with action type filter for USER_BANNED only. Verify the response contains only log entries matching the filter criteria, correctly excludes MODERATOR_ADDED entries. Test filtering by actor_id to show only actions performed by a specific moderator. Test date range filtering using from/to timestamps to narrow results to a specific time window. Validate that pagination works correctly when combined with filters - requesting page 1 with limit 10 returns appropriate subset with correct pagination metadata showing filtered total count.
 */
export async function test_api_moderation_logs_filtering_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Owner creates account and community
  const ownerConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(ownerConnection, {});
  const community = await generate_random_community_member_communities_create(
    ownerConnection,
    {},
  );
  typia.assert(community);
  // 2. Moderator joins, subscribes, and gets appointed
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderator = await authorize_member_join(moderatorConnection, {});
  typia.assert(moderator);
  await api.functional.community.member.communities.subscribe(
    moderatorConnection,
    { communityName: community.name },
  );
  const moderatorRecord =
    await generate_random_community_member_communities_moderators_create(
      ownerConnection,
      {
        params: { communityName: community.name },
        body: { member_username: moderator.username },
      },
    );
  typia.assert(moderatorRecord);
  // 3. Another user joins, subscribes, and gets banned by the moderator
  const bannedMemberConnection: api.IConnection = { host: connection.host };
  const bannedMember = await authorize_member_join(bannedMemberConnection, {});
  typia.assert(bannedMember);
  await api.functional.community.member.communities.subscribe(
    bannedMemberConnection,
    { communityName: community.name },
  );
  const banRecord =
    await generate_random_community_member_communities_bans_create(
      moderatorConnection,
      {
        params: { communityName: community.name },
        body: { username: bannedMember.username },
      },
    );
  typia.assert(banRecord);
  // Record timestamp after ban for date range testing
  const afterBanTimestamp = new Date().toISOString();
  // 4. Test filtering by action type - USER_BANNED only
  const userBannedLogs =
    await api.functional.community.member.communities.moderationLogs.index(
      moderatorConnection,
      {
        communityName: community.name,
        body: {
          actionTypes: ["USER_BANNED"],
        },
      },
    );
  typia.assert(userBannedLogs);
  // Verify all returned logs are USER_BANNED type
  TestValidator.predicate(
    "all logs should be USER_BANNED type",
    userBannedLogs.data.every((log) => log.actionType === "USER_BANNED"),
  );
  // Verify MODERATOR_ADDED logs are not included
  TestValidator.predicate(
    "MODERATOR_ADDED logs should be excluded",
    !userBannedLogs.data.some((log) => log.actionType === "MODERATOR_ADDED"),
  );
  // 5. Test filtering by actor_id - only actions by the moderator
  const actorFilteredLogs =
    await api.functional.community.member.communities.moderationLogs.index(
      moderatorConnection,
      {
        communityName: community.name,
        body: {
          actorId: moderator.id,
        },
      },
    );
  typia.assert(actorFilteredLogs);
  // Verify all logs are by the specified moderator
  TestValidator.predicate(
    "all logs should be by the specified moderator",
    actorFilteredLogs.data.every((log) => log.actor.id === moderator.id),
  );
  // 6. Test date range filtering - from timestamp
  const dateRangeLogs =
    await api.functional.community.member.communities.moderationLogs.index(
      moderatorConnection,
      {
        communityName: community.name,
        body: {
          from: afterBanTimestamp,
        },
      },
    );
  typia.assert(dateRangeLogs);
  // Verify all logs are after the from timestamp
  TestValidator.predicate(
    "all logs should be after from timestamp",
    dateRangeLogs.data.every(
      (log) => new Date(log.createdAt) >= new Date(afterBanTimestamp),
    ),
  );
  // 7. Test pagination with filters
  const paginatedLogs =
    await api.functional.community.member.communities.moderationLogs.index(
      moderatorConnection,
      {
        communityName: community.name,
        body: {
          page: 1,
          limit: 10,
        },
      },
    );
  typia.assert(paginatedLogs);
  // Verify pagination metadata
  TestValidator.equals(
    "current page should be 1",
    paginatedLogs.pagination.current,
    1,
  );
  TestValidator.predicate(
    "limit should be within bounds",
    paginatedLogs.pagination.limit >= 0 &&
      paginatedLogs.pagination.limit <= 100,
  );
  TestValidator.predicate(
    "records should match data length",
    paginatedLogs.pagination.records >= paginatedLogs.data.length,
  );
  // 8. Test combined filters with pagination
  const combinedFilterLogs =
    await api.functional.community.member.communities.moderationLogs.index(
      moderatorConnection,
      {
        communityName: community.name,
        body: {
          actionTypes: ["USER_BANNED"],
          actorId: moderator.id,
          page: 1,
          limit: 5,
        },
      },
    );
  typia.assert(combinedFilterLogs);
  // Verify combined filters work correctly
  TestValidator.predicate(
    "combined filters: all logs should be USER_BANNED",
    combinedFilterLogs.data.every((log) => log.actionType === "USER_BANNED"),
  );
  TestValidator.predicate(
    "combined filters: all logs should be by the moderator",
    combinedFilterLogs.data.every((log) => log.actor.id === moderator.id),
  );
  TestValidator.predicate(
    "combined filters: data length should respect limit",
    combinedFilterLogs.data.length <= 5,
  );
}
