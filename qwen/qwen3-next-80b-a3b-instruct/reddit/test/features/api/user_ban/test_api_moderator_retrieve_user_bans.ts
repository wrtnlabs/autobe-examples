import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityBbsModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsModerator";
import type { ICommunityBbsUserBan } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsUserBan";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityBbsUserBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityBbsUserBan";
import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";
export async function test_api_moderator_retrieve_user_bans(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create moderator connection and authenticate
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderator = await authorize_moderator_join(moderatorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password_hash: RandomGenerator.alphaNumeric(32),
    } satisfies ICommunityBbsModerator.IJoin,
  });
  typia.assert(moderator);
  // Step 2: Generate test ban records using random data that matches ISummary
  // We don't create bans via API (no create endpoint exists), so we generate test data
  const testBanRecords: ICommunityBbsUserBan.ISummary[] = ArrayUtil.repeat(
    10,
    () => {
      return typia.random<ICommunityBbsUserBan.ISummary>();
    },
  );
  // Step 3: Test filtering with different criteria on generated data
  // Test filtering by banned_user_id
  const targetBannedUserId = testBanRecords[0].bannedUserId;
  const filteredByUser =
    await api.functional.communityBbs.moderator.users.bans.patch(
      moderatorConnection,
      {
        body: {
          banned_user_id: targetBannedUserId,
        } satisfies ICommunityBbsUserBan.IRequest,
      },
    );
  typia.assert(filteredByUser);
  TestValidator.equals(
    "filtered by user ID has records",
    filteredByUser.data.length > 0,
    true,
  );
  filteredByUser.data.forEach((ban) => {
    TestValidator.equals(
      "ban record matches target user",
      ban.bannedUserId,
      targetBannedUserId,
    );
  });
  // Test filtering by moderator_id
  const targetModeratorId = moderator.id;
  const filteredByModerator =
    await api.functional.communityBbs.moderator.users.bans.patch(
      moderatorConnection,
      {
        body: {
          moderator_id: targetModeratorId,
        } satisfies ICommunityBbsUserBan.IRequest,
      },
    );
  typia.assert(filteredByModerator);
  TestValidator.equals(
    "filtered by moderator ID has records",
    filteredByModerator.data.length > 0,
    true,
  );
  filteredByModerator.data.forEach((ban) => {
    TestValidator.equals(
      "ban record matches target moderator",
      ban.moderatorId,
      targetModeratorId,
    );
  });
  // Test filtering by ban_reason
  const targetBanReason = "spam";
  const filteredByReason =
    await api.functional.communityBbs.moderator.users.bans.patch(
      moderatorConnection,
      {
        body: {
          ban_reason: targetBanReason,
        } satisfies ICommunityBbsUserBan.IRequest,
      },
    );
  typia.assert(filteredByReason);
  TestValidator.equals(
    "filtered by ban reason has records",
    filteredByReason.data.length > 0,
    true,
  );
  filteredByReason.data.forEach((ban) => {
    TestValidator.equals(
      "ban record matches target reason",
      ban.banReason,
      targetBanReason,
    );
  });
  // Test filtering by status
  const targetStatus = "active";
  const filteredByStatus =
    await api.functional.communityBbs.moderator.users.bans.patch(
      moderatorConnection,
      {
        body: {
          status: targetStatus,
        } satisfies ICommunityBbsUserBan.IRequest,
      },
    );
  typia.assert(filteredByStatus);
  TestValidator.equals(
    "filtered by status has records",
    filteredByStatus.data.length > 0,
    true,
  );
  filteredByStatus.data.forEach((ban) => {
    TestValidator.equals(
      "ban record matches target status",
      ban.status,
      targetStatus,
    );
  });
  // Test filtering by time range (start_time)
  const startTimeFilter = new Date().toISOString();
  const filteredByStartTime =
    await api.functional.communityBbs.moderator.users.bans.patch(
      moderatorConnection,
      {
        body: {
          start_time: startTimeFilter,
        } satisfies ICommunityBbsUserBan.IRequest,
      },
    );
  typia.assert(filteredByStartTime);
  TestValidator.equals(
    "filtered by start time has records",
    filteredByStartTime.data.length > 0,
    true,
  );
  filteredByStartTime.data.forEach((ban) => {
    TestValidator.predicate(
      "ban start time after filter",
      () => ban.startTime >= startTimeFilter,
    );
  });
  // Test filtering by time range (end_time)
  const endTimeFilter = new Date(Date.now() + 86400000).toISOString(); // 24 hours in future
  const filteredByEndTime =
    await api.functional.communityBbs.moderator.users.bans.patch(
      moderatorConnection,
      {
        body: {
          end_time: endTimeFilter,
        } satisfies ICommunityBbsUserBan.IRequest,
      },
    );
  typia.assert(filteredByEndTime);
  TestValidator.equals(
    "filtered by end time has records",
    filteredByEndTime.data.length > 0,
    true,
  );
  filteredByEndTime.data.forEach((ban) => {
    TestValidator.predicate("ban end time before filter", () => {
      if (ban.endTime === null || ban.endTime === undefined) return true; // permanent bans
      return ban.endTime <= endTimeFilter;
    });
  });
  // Test pagination
  // Pagination metadata (limit, current, records, pages) is part of the response, not the request
  // The request only supports filtering parameters, not pagination parameters
  // Let's test the API with default pagination by calling without parameters
  const paginated =
    await api.functional.communityBbs.moderator.users.bans.patch(
      moderatorConnection,
      {
        body: {} satisfies ICommunityBbsUserBan.IRequest, // Empty object for no filters
      },
    );
  typia.assert(paginated);
  TestValidator.equals(
    "pagination limit matches default",
    paginated.pagination.limit,
    10,
  );
  TestValidator.equals(
    "pagination current matches default",
    paginated.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination records greater than 0",
    paginated.pagination.records > 0,
    true,
  );
  TestValidator.equals(
    "data length matches total fetched",
    paginated.data.length,
    paginated.pagination.records,
  );
  // Test combined filters
  const combinedFilter =
    await api.functional.communityBbs.moderator.users.bans.patch(
      moderatorConnection,
      {
        body: {
          banned_user_id: targetBannedUserId,
          moderator_id: targetModeratorId,
          ban_reason: targetBanReason,
          status: targetStatus,
          start_time: startTimeFilter,
        } satisfies ICommunityBbsUserBan.IRequest,
      },
    );
  typia.assert(combinedFilter);
  TestValidator.equals(
    "combined filter has records",
    combinedFilter.data.length > 0,
    true,
  );
  combinedFilter.data.forEach((ban) => {
    TestValidator.equals(
      "combined ban user matches",
      ban.bannedUserId,
      targetBannedUserId,
    );
    TestValidator.equals(
      "combined ban moderator matches",
      ban.moderatorId,
      targetModeratorId,
    );
    TestValidator.equals(
      "combined ban reason matches",
      ban.banReason,
      targetBanReason,
    );
    TestValidator.equals(
      "combined ban status matches",
      ban.status,
      targetStatus,
    );
    TestValidator.predicate(
      "combined ban start time after filter",
      () => ban.startTime >= startTimeFilter,
    );
  });
  // Step 4: Verify unauthorized access (without authentication)
  const unauthenticatedConnection: api.IConnection = { host: connection.host };
  await TestValidator.error("unauthorized access should fail", async () => {
    await api.functional.communityBbs.moderator.users.bans.patch(
      unauthenticatedConnection,
      {
        // No authentication token
        body: {} satisfies ICommunityBbsUserBan.IRequest, // Empty request body - no 'body' property error
      },
    );
  });
}
