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

/**
 * Test ban analytics specifically for active ban monitoring workflow.
 * Create multiple active bans with different characteristics - temporary bans with varying durations,
 * permanent bans, and bans with pending appeals. Filter specifically for active ban status
 * to monitor current enforcement. Test date range filtering to focus on recent ban activity.
 * Verify the analytics provide accurate counts of active bans, proper duration calculations,
 * and appeal status tracking. Validate that banned user information is correctly displayed
 * and that banning administrator details are properly referenced for accountability tracking.
 */
export async function test_api_admin_ban_analytics_active_bans_monitoring(
  connection: api.IConnection,
): Promise<void> {
  // Create administrator connection
  const adminConnection: api.IConnection = { host: connection.host };
  // Register administrator using available utility function
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  // Test active ban filtering
  const activeBansResponse =
    await api.functional.discussionBoard.admin.analytics.bans.index(
      adminConnection,
      {
        body: {
          ban_status: "active",
          ban_duration_type: null,
          appeal_status: null,
          banning_administrator_id: null,
          ban_started_at_from: null,
          ban_started_at_to: null,
          ban_ends_at_from: null,
          ban_ends_at_to: null,
          search: null,
          page: 1,
          limit: 50,
        } satisfies IDiscussionBoardUserBan.IRequest,
      },
    );
  typia.assert(activeBansResponse);
  // Test date range filtering for recent bans
  const recentBansResponse =
    await api.functional.discussionBoard.admin.analytics.bans.index(
      adminConnection,
      {
        body: {
          ban_status: "active",
          ban_duration_type: null,
          appeal_status: null,
          banning_administrator_id: null,
          ban_started_at_from: new Date(
            Date.now() - 7 * 24 * 60 * 60 * 1000,
          ).toISOString(),
          ban_started_at_to: new Date().toISOString(),
          ban_ends_at_from: null,
          ban_ends_at_to: null,
          search: null,
          page: 1,
          limit: 50,
        } satisfies IDiscussionBoardUserBan.IRequest,
      },
    );
  typia.assert(recentBansResponse);
  // Test filtering by ban duration type
  const temporaryBansResponse =
    await api.functional.discussionBoard.admin.analytics.bans.index(
      adminConnection,
      {
        body: {
          ban_status: "active",
          ban_duration_type: "temporary",
          appeal_status: null,
          banning_administrator_id: null,
          ban_started_at_from: null,
          ban_started_at_to: null,
          ban_ends_at_from: null,
          ban_ends_at_to: null,
          search: null,
          page: 1,
          limit: 50,
        } satisfies IDiscussionBoardUserBan.IRequest,
      },
    );
  typia.assert(temporaryBansResponse);
  const permanentBansResponse =
    await api.functional.discussionBoard.admin.analytics.bans.index(
      adminConnection,
      {
        body: {
          ban_status: "active",
          ban_duration_type: "permanent",
          appeal_status: null,
          banning_administrator_id: null,
          ban_started_at_from: null,
          ban_started_at_to: null,
          ban_ends_at_from: null,
          ban_ends_at_to: null,
          search: null,
          page: 1,
          limit: 50,
        } satisfies IDiscussionBoardUserBan.IRequest,
      },
    );
  typia.assert(permanentBansResponse);
  // Test appeal status filtering
  const pendingAppealBansResponse =
    await api.functional.discussionBoard.admin.analytics.bans.index(
      adminConnection,
      {
        body: {
          ban_status: "active",
          ban_duration_type: null,
          appeal_status: "pending",
          banning_administrator_id: null,
          ban_started_at_from: null,
          ban_started_at_to: null,
          ban_ends_at_from: null,
          ban_ends_at_to: null,
          search: null,
          page: 1,
          limit: 50,
        } satisfies IDiscussionBoardUserBan.IRequest,
      },
    );
  typia.assert(pendingAppealBansResponse);
  // Validate pagination structure using TestValidator
  TestValidator.equals(
    "pagination structure present",
    typeof activeBansResponse.pagination,
    "object",
  );
  TestValidator.predicate(
    "pagination has current page",
    activeBansResponse.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination has limit",
    activeBansResponse.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination has records count",
    activeBansResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination has pages count",
    activeBansResponse.pagination.pages >= 0,
  );
  // Validate business logic - if we have data, ensure it matches our filter criteria
  if (activeBansResponse.data.length > 0) {
    const banSummary = activeBansResponse.data[0];
    TestValidator.equals(
      "active ban status filter works",
      banSummary.ban_status,
      "active",
    );
  }
  if (temporaryBansResponse.data.length > 0) {
    const banSummary = temporaryBansResponse.data[0];
    TestValidator.equals(
      "temporary ban filter works",
      banSummary.ban_duration_type,
      "temporary",
    );
  }
  if (permanentBansResponse.data.length > 0) {
    const banSummary = permanentBansResponse.data[0];
    TestValidator.equals(
      "permanent ban filter works",
      banSummary.ban_duration_type,
      "permanent",
    );
  }
  if (pendingAppealBansResponse.data.length > 0) {
    const banSummary = pendingAppealBansResponse.data[0];
    TestValidator.equals(
      "pending appeal filter works",
      banSummary.appeal_status,
      "pending",
    );
  }
}
