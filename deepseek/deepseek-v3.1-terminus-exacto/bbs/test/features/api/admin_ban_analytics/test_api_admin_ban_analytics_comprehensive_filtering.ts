import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
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

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_ban_analytics_comprehensive_filtering(
  connection: api.IConnection,
): Promise<void> {
  // Create administrator connections for testing
  const adminConnection: api.IConnection = { host: connection.host };
  // Register and authenticate administrator
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // Note: Since we cannot create actual ban records (no ban creation endpoint available),
  // we can only test the analytics endpoint with various filter combinations
  // The system may have existing ban records or the endpoint may return empty results
  // Test 1: Basic analytics query with no filters
  const allBansResponse =
    await api.functional.discussionBoard.admin.analytics.bans.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardUserBan.IRequest,
      },
    );
  typia.assert(allBansResponse);
  // Test 2: Filter by active ban status
  const activeBansResponse =
    await api.functional.discussionBoard.admin.analytics.bans.index(
      adminConnection,
      {
        body: {
          ban_status: "active",
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardUserBan.IRequest,
      },
    );
  typia.assert(activeBansResponse);
  // Test 3: Filter by temporary ban duration
  const temporaryBansResponse =
    await api.functional.discussionBoard.admin.analytics.bans.index(
      adminConnection,
      {
        body: {
          ban_duration_type: "temporary",
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardUserBan.IRequest,
      },
    );
  typia.assert(temporaryBansResponse);
  // Test 4: Filter by appeal status
  const noAppealBansResponse =
    await api.functional.discussionBoard.admin.analytics.bans.index(
      adminConnection,
      {
        body: {
          appeal_status: "none",
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardUserBan.IRequest,
      },
    );
  typia.assert(noAppealBansResponse);
  // Test 5: Filter by date range (past week)
  const recentBansResponse =
    await api.functional.discussionBoard.admin.analytics.bans.index(
      adminConnection,
      {
        body: {
          ban_started_at_from: new Date(
            Date.now() - 7 * 24 * 60 * 60 * 1000,
          ).toISOString(),
          ban_started_at_to: new Date().toISOString(),
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardUserBan.IRequest,
      },
    );
  typia.assert(recentBansResponse);
  // Test 6: Complex combination filter
  const complexFilterResponse =
    await api.functional.discussionBoard.admin.analytics.bans.index(
      adminConnection,
      {
        body: {
          ban_status: "active",
          ban_duration_type: "temporary",
          appeal_status: "none",
          page: 1,
          limit: 5,
        } satisfies IDiscussionBoardUserBan.IRequest,
      },
    );
  typia.assert(complexFilterResponse);
  // Validate pagination structure for all responses
  const responses = [
    allBansResponse,
    activeBansResponse,
    temporaryBansResponse,
    noAppealBansResponse,
    recentBansResponse,
    complexFilterResponse,
  ];
  for (const response of responses) {
    TestValidator.predicate(
      "pagination limit valid",
      response.pagination.limit > 0,
    );
    TestValidator.predicate(
      "pagination current page valid",
      response.pagination.current >= 0,
    );
    TestValidator.predicate(
      "pagination records count valid",
      response.pagination.records >= 0,
    );
    TestValidator.predicate(
      "pagination pages count valid",
      response.pagination.pages >= 0,
    );
    // Validate that limit is respected
    TestValidator.predicate(
      "data length respects limit",
      response.data.length <= response.pagination.limit,
    );
    // Validate ban summary structure if data exists
    if (response.data.length > 0) {
      const banSummary = response.data[0];
      TestValidator.predicate(
        "ban summary has valid ID",
        typeof banSummary.id === "string" && banSummary.id.length > 0,
      );
      TestValidator.predicate(
        "ban summary has ban reason",
        typeof banSummary.ban_reason === "string",
      );
      TestValidator.predicate(
        "ban summary has duration type",
        typeof banSummary.ban_duration_type === "string",
      );
      TestValidator.predicate(
        "ban summary has status",
        typeof banSummary.ban_status === "string",
      );
      TestValidator.predicate(
        "ban summary has appeal status",
        typeof banSummary.appeal_status === "string",
      );
      TestValidator.predicate(
        "ban summary has start timestamp",
        typeof banSummary.ban_started_at === "string" &&
          banSummary.ban_started_at.length > 0,
      );
      // Validate nested structures
      TestValidator.predicate(
        "banned user summary valid",
        typeof banSummary.bannedUser === "object" &&
          typeof banSummary.bannedUser.id === "string" &&
          banSummary.bannedUser.id.length > 0,
      );
      TestValidator.predicate(
        "banning administrator summary valid",
        typeof banSummary.banningAdministrator === "object" &&
          typeof banSummary.banningAdministrator.id === "string" &&
          banSummary.banningAdministrator.id.length > 0,
      );
    }
  }
  // Test search functionality with empty search (should return all)
  const searchResponse =
    await api.functional.discussionBoard.admin.analytics.bans.index(
      adminConnection,
      {
        body: {
          search: "",
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardUserBan.IRequest,
      },
    );
  typia.assert(searchResponse);
  // Test different pagination parameters
  const paginationTest =
    await api.functional.discussionBoard.admin.analytics.bans.index(
      adminConnection,
      {
        body: {
          page: 2,
          limit: 5,
        } satisfies IDiscussionBoardUserBan.IRequest,
      },
    );
  typia.assert(paginationTest);
  TestValidator.predicate(
    "pagination page 2 valid",
    paginationTest.pagination.current === 2,
  );
  TestValidator.predicate(
    "pagination limit 5 valid",
    paginationTest.pagination.limit === 5,
  );
}
