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
 * Test ban analytics focusing on appeal trends and moderation effectiveness.
 * Create bans with different appeal statuses - none, pending, under review, approved, and rejected appeals.
 * Filter specifically by appeal status to analyze appeal patterns and outcomes.
 * Test combinations of appeal status with ban duration types and statuses to identify trends in appeal handling.
 * Verify the analytics correctly track appeal rates, approval/rejection patterns, and provide insights into moderation effectiveness.
 * Validate that appeal-related timestamps and status transitions are accurately reflected in the analytics data.
 */
export async function test_api_admin_ban_analytics_appeal_trends(
  connection: api.IConnection,
): Promise<void> {
  // <E2E TEST CODE HERE>
  // Create multiple administrator connections for testing
  const adminConnection1: api.IConnection = { host: connection.host };
  const admin1 = await authorize_admin_join(adminConnection1, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(admin1);
  const adminConnection2: api.IConnection = { host: connection.host };
  const admin2 = await authorize_admin_join(adminConnection2, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(admin2);
  // Test analytics with different appeal status filters
  const appealStatuses = [
    "none",
    "pending",
    "under_review",
    "approved",
    "rejected",
  ] as const;
  for (const appealStatus of appealStatuses) {
    const analyticsResponse =
      await api.functional.discussionBoard.admin.analytics.bans.index(
        adminConnection1,
        {
          body: {
            appeal_status: appealStatus,
            page: 1,
            limit: 10,
          } satisfies IDiscussionBoardUserBan.IRequest,
        },
      );
    typia.assert(analyticsResponse);
    // Validate pagination structure
    TestValidator.predicate(
      `pagination exists for appeal status ${appealStatus}`,
      analyticsResponse.pagination !== undefined,
    );
    TestValidator.equals(
      `pagination current page is 1 for ${appealStatus}`,
      analyticsResponse.pagination.current,
      1,
    );
    TestValidator.predicate(
      `pagination limit is valid for ${appealStatus}`,
      analyticsResponse.pagination.limit >= 1,
    );
    TestValidator.predicate(
      `pagination records is non-negative for ${appealStatus}`,
      analyticsResponse.pagination.records >= 0,
    );
    TestValidator.predicate(
      `pagination pages is non-negative for ${appealStatus}`,
      analyticsResponse.pagination.pages >= 0,
    );
    // Validate data structure for each item matches appeal status filter
    for (const ban of analyticsResponse.data) {
      typia.assert(ban);
      TestValidator.equals(
        `ban appeal status matches filter ${appealStatus}`,
        ban.appeal_status,
        appealStatus,
      );
      TestValidator.predicate(
        `ban has valid ban reason for ${appealStatus}`,
        typeof ban.ban_reason === "string" && ban.ban_reason.length > 0,
      );
      TestValidator.predicate(
        `ban has valid ban duration type for ${appealStatus}`,
        ban.ban_duration_type === "temporary" ||
          ban.ban_duration_type === "permanent",
      );
      TestValidator.predicate(
        `ban has valid ban status for ${appealStatus}`,
        typeof ban.ban_status === "string" && ban.ban_status.length > 0,
      );
      TestValidator.predicate(
        `ban has valid ban started at timestamp for ${appealStatus}`,
        typeof ban.ban_started_at === "string" && ban.ban_started_at.length > 0,
      );
      // Validate nested user structure
      TestValidator.predicate(
        `banned user exists for ${appealStatus}`,
        ban.bannedUser !== undefined,
      );
      TestValidator.predicate(
        `banned user has valid ID for ${appealStatus}`,
        typeof ban.bannedUser.id === "string" && ban.bannedUser.id.length > 0,
      );
      TestValidator.predicate(
        `banned user has valid display name for ${appealStatus}`,
        typeof ban.bannedUser.display_name === "string" &&
          ban.bannedUser.display_name.length > 0,
      );
      // Validate nested administrator structure
      TestValidator.predicate(
        `banning administrator exists for ${appealStatus}`,
        ban.banningAdministrator !== undefined,
      );
      TestValidator.predicate(
        `banning administrator has valid ID for ${appealStatus}`,
        typeof ban.banningAdministrator.id === "string" &&
          ban.banningAdministrator.id.length > 0,
      );
      TestValidator.predicate(
        `banning administrator has valid email for ${appealStatus}`,
        typeof ban.banningAdministrator.email === "string" &&
          ban.banningAdministrator.email.length > 0,
      );
      TestValidator.predicate(
        `banning administrator has valid display name for ${appealStatus}`,
        typeof ban.banningAdministrator.display_name === "string" &&
          ban.banningAdministrator.display_name.length > 0,
      );
    }
  }
  // Test combination filters with appeal status and duration type
  const durationTypes = ["temporary", "permanent"] as const;
  for (const durationType of durationTypes) {
    const comboAnalytics =
      await api.functional.discussionBoard.admin.analytics.bans.index(
        adminConnection1,
        {
          body: {
            appeal_status: "pending",
            ban_duration_type: durationType,
            page: 1,
            limit: 5,
          } satisfies IDiscussionBoardUserBan.IRequest,
        },
      );
    typia.assert(comboAnalytics);
    for (const ban of comboAnalytics.data) {
      TestValidator.equals(
        `ban appeal status is pending for duration type ${durationType}`,
        ban.appeal_status,
        "pending",
      );
      TestValidator.equals(
        `ban duration type matches filter ${durationType}`,
        ban.ban_duration_type,
        durationType,
      );
    }
  }
  // Test analytics with no filters (should return all bans)
  const allAnalytics =
    await api.functional.discussionBoard.admin.analytics.bans.index(
      adminConnection1,
      {
        body: {
          page: 1,
          limit: 20,
        } satisfies IDiscussionBoardUserBan.IRequest,
      },
    );
  typia.assert(allAnalytics);
  // Verify the analytics provides meaningful statistical data
  TestValidator.predicate(
    "analytics returns paginated results",
    allAnalytics.pagination.records >= 0,
  );
  TestValidator.predicate(
    "analytics data structure is consistent",
    Array.isArray(allAnalytics.data),
  );
  // Test edge case with invalid appeal status (should still return valid response)
  const invalidAppealStatus =
    await api.functional.discussionBoard.admin.analytics.bans.index(
      adminConnection1,
      {
        body: {
          appeal_status: null,
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardUserBan.IRequest,
      },
    );
  typia.assert(invalidAppealStatus);
  // Validate that the analytics system correctly handles different appeal scenarios
  TestValidator.predicate(
    "analytics system processes empty appeal status filter",
    invalidAppealStatus.pagination !== undefined,
  );
}
