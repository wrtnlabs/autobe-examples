import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import type { IDiscussionBoardUserBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUserBan";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardUserBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardUserBan";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

export async function test_api_superadmin_analytics_bans_comprehensive_filtering(
  connection: api.IConnection,
): Promise<void> {
  // Setup super administrator connection using utility function
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdminAuth = await authorize_super_admin_join(
    superAdminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<string & tags.Format<"password">>(),
        privilege_level: "super_admin",
      } satisfies IDiscussionBoardSuperAdmin.IJoin,
    },
  );
  // Test 1: Filter by ban status - active bans
  const activeBans =
    await api.functional.discussionBoard.superAdmin.analytics.bans.index(
      superAdminConnection,
      {
        body: {
          ban_status: "active",
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardUserBan.IRequest,
      },
    );
  typia.assert(activeBans);
  // Test 2: Filter by duration type - temporary bans
  const temporaryBans =
    await api.functional.discussionBoard.superAdmin.analytics.bans.index(
      superAdminConnection,
      {
        body: {
          ban_duration_type: "temporary",
          page: 1,
          limit: 5,
        } satisfies IDiscussionBoardUserBan.IRequest,
      },
    );
  typia.assert(temporaryBans);
  // Test 3: Filter by appeal status - pending appeals
  const pendingAppeals =
    await api.functional.discussionBoard.superAdmin.analytics.bans.index(
      superAdminConnection,
      {
        body: {
          appeal_status: "pending",
          page: 1,
          limit: 8,
        } satisfies IDiscussionBoardUserBan.IRequest,
      },
    );
  typia.assert(pendingAppeals);
  // Test 4: Date range filtering - recent bans
  const oneWeekAgo = new Date(
    Date.now() - 7 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const recentBans =
    await api.functional.discussionBoard.superAdmin.analytics.bans.index(
      superAdminConnection,
      {
        body: {
          ban_started_at_from: oneWeekAgo,
          page: 1,
          limit: 15,
        } satisfies IDiscussionBoardUserBan.IRequest,
      },
    );
  typia.assert(recentBans);
  // Test 5: Combined filters - active temporary bans
  const combinedFilter =
    await api.functional.discussionBoard.superAdmin.analytics.bans.index(
      superAdminConnection,
      {
        body: {
          ban_status: "active",
          ban_duration_type: "temporary",
          appeal_status: "none",
          page: 1,
          limit: 20,
        } satisfies IDiscussionBoardUserBan.IRequest,
      },
    );
  typia.assert(combinedFilter);
  // Test 6: Empty filter parameters (should return all records)
  const allBans =
    await api.functional.discussionBoard.superAdmin.analytics.bans.index(
      superAdminConnection,
      {
        body: {
          page: 1,
          limit: 25,
        } satisfies IDiscussionBoardUserBan.IRequest,
      },
    );
  typia.assert(allBans);
  // Test 7: Search functionality with text filter
  const searchResults =
    await api.functional.discussionBoard.superAdmin.analytics.bans.index(
      superAdminConnection,
      {
        body: {
          search: "violation",
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardUserBan.IRequest,
      },
    );
  typia.assert(searchResults);
  // Validate response structure - business logic only, no type checking
  if (allBans.data.length > 0) {
    const sampleBan = allBans.data[0];
    // Test business logic: unique ID should be present
    TestValidator.predicate("ban has valid ID", sampleBan.id.length > 0);
    // Test business logic: ban reason should not be empty
    TestValidator.predicate("ban has reason", sampleBan.ban_reason.length > 0);
    // Test business logic: banned user should have display name
    TestValidator.predicate(
      "banned user has display name",
      sampleBan.bannedUser.display_name.length > 0,
    );
    // Test business logic: banning administrator should have email
    TestValidator.predicate(
      "banning administrator has email",
      sampleBan.banningAdministrator.email.includes("@"),
    );
    // Test business logic: ban start date should be valid ISO string
    TestValidator.predicate(
      "ban start date is valid",
      !isNaN(new Date(sampleBan.ban_started_at).getTime()),
    );
    // Test business logic: permanent bans should have null end date
    if (sampleBan.ban_duration_type === "permanent") {
      TestValidator.equals(
        "permanent ban has null end date",
        sampleBan.ban_ends_at,
        null,
      );
    }
  }
}
