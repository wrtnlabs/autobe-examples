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

/**
 * Test analytics specifically for active temporary bans within a recent time period.
 * Super administrators often need to monitor currently active temporary bans to track
 * moderation effectiveness and identify patterns. This test filters for ban_status='active',
 * ban_duration_type='temporary', and sets date ranges for ban_started_at within the last 30 days.
 * Verifies that only active temporary bans within the specified timeframe are returned.
 * Checks that the response includes proper ban duration information and that banned users'
 * profiles are correctly populated. Validates that pagination handles the filtered results correctly.
 */
export async function test_api_superadmin_analytics_bans_active_temporary_bans(
  connection: api.IConnection,
): Promise<void> {
  // Create super admin connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      privilege_level: "super_admin",
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  // Calculate date ranges for filtering
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  // Test analytics with active temporary bans filter
  const analyticsResponse =
    await api.functional.discussionBoard.superAdmin.analytics.bans.index(
      superAdminConnection,
      {
        body: {
          ban_status: "active",
          ban_duration_type: "temporary",
          ban_started_at_from: thirtyDaysAgo.toISOString(),
          ban_started_at_to: now.toISOString(),
          page: 1,
          limit: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
          >(),
        } satisfies IDiscussionBoardUserBan.IRequest,
      },
    );
  typia.assert(analyticsResponse);
  // Validate pagination structure
  TestValidator.equals(
    "pagination structure",
    typeof analyticsResponse.pagination,
    "object",
  );
  TestValidator.predicate(
    "has current page",
    analyticsResponse.pagination.current >= 1,
  );
  TestValidator.predicate(
    "has valid limit",
    analyticsResponse.pagination.limit >= 1 &&
      analyticsResponse.pagination.limit <= 100,
  );
  TestValidator.predicate(
    "has records count",
    analyticsResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "has pages count",
    analyticsResponse.pagination.pages >= 0,
  );
  // Validate each ban record meets the filter criteria
  for (const banRecord of analyticsResponse.data) {
    TestValidator.equals("ban status active", banRecord.ban_status, "active");
    TestValidator.equals(
      "ban duration type temporary",
      banRecord.ban_duration_type,
      "temporary",
    );
    // Validate ban start date is within the last 30 days
    const banStartedAt = new Date(banRecord.ban_started_at);
    TestValidator.predicate(
      "ban started within timeframe",
      banStartedAt >= thirtyDaysAgo && banStartedAt <= now,
    );
    // Validate ban end date exists for temporary bans (checking schema allows null)
    TestValidator.predicate(
      "temporary ban has end date",
      banRecord.ban_ends_at !== null,
    );
    // Validate banned user profile structure
    TestValidator.equals(
      "banned user has id",
      typeof banRecord.bannedUser.id,
      "string",
    );
    TestValidator.equals(
      "banned user has display name",
      typeof banRecord.bannedUser.display_name,
      "string",
    );
    TestValidator.predicate(
      "banned user bio can be null",
      banRecord.bannedUser.bio === null ||
        typeof banRecord.bannedUser.bio === "string",
    );
    // Validate banning administrator structure
    TestValidator.equals(
      "banning admin has id",
      typeof banRecord.banningAdministrator.id,
      "string",
    );
    TestValidator.equals(
      "banning admin has email",
      typeof banRecord.banningAdministrator.email,
      "string",
    );
    TestValidator.equals(
      "banning admin has display name",
      typeof banRecord.banningAdministrator.display_name,
      "string",
    );
  }
  // Test pagination with different page only if there are enough records
  if (analyticsResponse.pagination.pages >= 2) {
    const page2Response =
      await api.functional.discussionBoard.superAdmin.analytics.bans.index(
        superAdminConnection,
        {
          body: {
            ban_status: "active",
            ban_duration_type: "temporary",
            ban_started_at_from: thirtyDaysAgo.toISOString(),
            ban_started_at_to: now.toISOString(),
            page: 2,
            limit: typia.random<
              number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
            >(),
          } satisfies IDiscussionBoardUserBan.IRequest,
        },
      );
    typia.assert(page2Response);
    // Validate pagination consistency
    TestValidator.equals(
      "same total records",
      analyticsResponse.pagination.records,
      page2Response.pagination.records,
    );
  }
  // Validate empty result set handling
  if (analyticsResponse.data.length === 0) {
    TestValidator.equals("empty data array", analyticsResponse.data.length, 0);
    TestValidator.predicate(
      "records count matches data length",
      analyticsResponse.pagination.records === 0,
    );
  }
}
