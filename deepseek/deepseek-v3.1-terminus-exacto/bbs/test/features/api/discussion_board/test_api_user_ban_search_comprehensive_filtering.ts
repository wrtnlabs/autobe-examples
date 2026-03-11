import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardUserBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUserBan";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardUserBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardUserBan";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_user_ban_search_comprehensive_filtering(
  connection: api.IConnection,
): Promise<void> {
  // Create administrator connection
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  // Test 1: Search with no filters (get all bans)
  const allBans = await api.functional.discussionBoard.admin.user_bans.index(
    adminConnection,
    {
      body: {
        page: 1,
        limit: 10,
      } satisfies IDiscussionBoardUserBan.IRequest,
    },
  );
  typia.assert(allBans);
  // Test 2: Search with status filter
  const activeBans = await api.functional.discussionBoard.admin.user_bans.index(
    adminConnection,
    {
      body: {
        status: "active",
        page: 1,
        limit: 5,
      } satisfies IDiscussionBoardUserBan.IRequest,
    },
  );
  typia.assert(activeBans);
  // Test 3: Search with reason text filter
  const reasonSearch =
    await api.functional.discussionBoard.admin.user_bans.index(
      adminConnection,
      {
        body: {
          reason: "violation",
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardUserBan.IRequest,
      },
    );
  typia.assert(reasonSearch);
  // Test 4: Search with date range filter
  const dateFrom = new Date(
    Date.now() - 30 * 24 * 60 * 60 * 1000,
  ).toISOString(); // 30 days ago
  const dateTo = new Date().toISOString();
  const dateFilteredBans =
    await api.functional.discussionBoard.admin.user_bans.index(
      adminConnection,
      {
        body: {
          banned_at_from: dateFrom,
          banned_at_to: dateTo,
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardUserBan.IRequest,
      },
    );
  typia.assert(dateFilteredBans);
  // Test 5: Search with pagination limits
  const smallPage = await api.functional.discussionBoard.admin.user_bans.index(
    adminConnection,
    {
      body: {
        page: 1,
        limit: 1,
      } satisfies IDiscussionBoardUserBan.IRequest,
    },
  );
  typia.assert(smallPage);
  TestValidator.predicate("limit respected", smallPage.data.length <= 1);
  // Test 6: Search with multiple filters combined
  const combinedFilter =
    await api.functional.discussionBoard.admin.user_bans.index(
      adminConnection,
      {
        body: {
          status: "active",
          reason: "spam",
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardUserBan.IRequest,
      },
    );
  typia.assert(combinedFilter);
  // Validate response structure for member and admin details
  if (allBans.data.length > 0) {
    const ban = allBans.data[0];
    TestValidator.predicate(
      "member has valid display name",
      ban.member.display_name.length > 0,
    );
    TestValidator.predicate(
      "admin has valid email format",
      ban.admin.email.includes("@"),
    );
    TestValidator.predicate(
      "ban has valid status",
      ["active", "expired", "removed"].includes(ban.status),
    );
  }
  // Test 7: Search with null filter values (should disable filters)
  const nullFilters =
    await api.functional.discussionBoard.admin.user_bans.index(
      adminConnection,
      {
        body: {
          member_id: null,
          admin_id: null,
          status: null,
          reason: null,
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardUserBan.IRequest,
      },
    );
  typia.assert(nullFilters);
  // Test 8: Verify pagination metadata business logic
  TestValidator.predicate(
    "current page is positive",
    allBans.pagination.current > 0,
  );
  TestValidator.predicate(
    "limit is within bounds",
    allBans.pagination.limit >= 1 && allBans.pagination.limit <= 100,
  );
  TestValidator.predicate(
    "records count is non-negative",
    allBans.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages count is non-negative",
    allBans.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "pagination calculation correct",
    allBans.pagination.pages ===
      Math.ceil(allBans.pagination.records / allBans.pagination.limit),
  );
}
