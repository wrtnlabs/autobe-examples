import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorDistributionStatistic";
import type { IDiscussionBoardBanRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardBanRecord";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorDistributionStatistic";
import type { IPageIDiscussionBoardBanRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardBanRecord";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_discussion_board_admin_bans_create } from "../../../generate/generate_random_discussion_board_admin_bans_create";
import { prepare_random_discussion_board_ban_record } from "../../../prepare/prepare_random_discussion_board_ban_record";

export async function test_api_admin_bans_advanced_date_search(
  connection: api.IConnection,
): Promise<void> {
  // Create separate connections for different actors
  const adminConnection: api.IConnection = { host: connection.host };
  // Create administrator account first
  const adminJoin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "admin123",
      display_name: RandomGenerator.name(),
      href: "http://localhost:3000",
      referrer: "http://localhost:3000/admin",
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(adminJoin);
  // Login as administrator
  const adminAuth = await authorize_admin_login(adminConnection, {
    body: {
      email: adminJoin.email,
      password: "admin123",
      href: "http://localhost:3000",
      referrer: "http://localhost:3000/admin",
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.ILogin,
  });
  typia.assert(adminAuth);
  // Create multiple users for testing
  const users: IDiscussionBoardUser.IAuthorized[] = [];
  for (let i = 0; i < 4; i++) {
    const userConnection: api.IConnection = { host: connection.host };
    const userAuth = await authorize_user_join(userConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "user123",
        display_name: RandomGenerator.name(),
      } satisfies IDiscussionBoardUser.IJoin,
    });
    typia.assert(userAuth);
    users.push(userAuth);
  }
  // Generate various ban scenarios with different duration types
  const banRecords: IDiscussionBoardBanRecord[] = [];
  // Create ban records with different duration scenarios (let system handle dates)
  const banScenarios = [
    {
      userIndex: 0,
      durationType: "temporary" as const,
      durationDays: 7,
    },
    {
      userIndex: 1,
      durationType: "temporary" as const,
      durationDays: 30,
    },
    {
      userIndex: 2,
      durationType: "permanent" as const,
      durationDays: null,
    },
    {
      userIndex: 3,
      durationType: "temporary" as const,
      durationDays: 1,
    },
  ];
  // Create ban records for each scenario
  for (const scenario of banScenarios) {
    const targetUser = users[scenario.userIndex];
    const banRecord = await generate_random_discussion_board_admin_bans_create(
      adminConnection,
      {
        body: {
          bannedUserId: targetUser.id,
          banReason: RandomGenerator.paragraph({
            sentences: 2,
          }) satisfies string & tags.MinLength<10>,
          banDurationType: scenario.durationType,
          banDurationDays: scenario.durationDays,
        } satisfies IDiscussionBoardBanRecord.ICreate,
      },
    );
    typia.assert(banRecord);
    banRecords.push(banRecord);
  }
  // Wait briefly to ensure all bans are processed
  await new Promise((resolve) => setTimeout(resolve, 100));
  const now = new Date();
  // Test 1: Search all bans (baseline)
  const searchAllBans =
    await api.functional.discussionBoard.admin.user_bans.index(
      adminConnection,
      {
        body: {
          banStartedAtFrom: null,
          banStartedAtTo: null,
          banEndsAtFrom: null,
          banEndsAtTo: null,
          page: 1,
          limit: 20,
        } satisfies IDiscussionBoardBanRecord.IRequest,
      },
    );
  typia.assert(searchAllBans);
  TestValidator.predicate(
    "search returns at least created bans",
    searchAllBans.data.length >= banRecords.length,
  );
  // Test 2: Search bans started in the past week
  const searchRecentBans =
    await api.functional.discussionBoard.admin.user_bans.index(
      adminConnection,
      {
        body: {
          banStartedAtFrom: new Date(
            now.getTime() - 7 * 24 * 60 * 60 * 1000,
          ).toISOString(),
          banStartedAtTo: now.toISOString(),
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardBanRecord.IRequest,
      },
    );
  typia.assert(searchRecentBans);
  // Test 3: Search with ban status filter
  const searchActiveBans =
    await api.functional.discussionBoard.admin.user_bans.index(
      adminConnection,
      {
        body: {
          banStatus: "active",
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardBanRecord.IRequest,
      },
    );
  typia.assert(searchActiveBans);
  // Test 4: Search with appeal status filter
  const searchNoAppealBans =
    await api.functional.discussionBoard.admin.user_bans.index(
      adminConnection,
      {
        body: {
          appealStatus: "none",
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardBanRecord.IRequest,
      },
    );
  typia.assert(searchNoAppealBans);
  // Test 5: Search with text filter
  const searchWithText =
    await api.functional.discussionBoard.admin.user_bans.index(
      adminConnection,
      {
        body: {
          search: RandomGenerator.substring(
            RandomGenerator.paragraph({ sentences: 1 }),
          ),
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardBanRecord.IRequest,
      },
    );
  typia.assert(searchWithText);
  // Validate pagination structure
  TestValidator.predicate(
    "pagination has current page",
    searchAllBans.pagination.pagination.current === 1,
  );
  TestValidator.predicate(
    "pagination has limit",
    searchAllBans.pagination.pagination.limit === 20,
  );
  TestValidator.predicate(
    "pagination has total records",
    searchAllBans.pagination.pagination.records >= banRecords.length,
  );
  TestValidator.predicate(
    "pagination has total pages",
    searchAllBans.pagination.pagination.pages >= 1,
  );
}
