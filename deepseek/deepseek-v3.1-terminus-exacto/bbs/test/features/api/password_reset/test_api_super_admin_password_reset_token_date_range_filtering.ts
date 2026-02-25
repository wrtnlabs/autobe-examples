import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorDistributionStatistic";
import type { IDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorPromotionRequest";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import type { IDiscussionBoardSuperAdminPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdminPasswordReset";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorDistributionStatistic";
import type { IPageIDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorPromotionRequest";
import type { IPageIDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSection";
import type { IPageIDiscussionBoardSuperAdminPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSuperAdminPasswordReset";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

/**
 * Test date range filtering for password reset token historical analysis.
 * 1. Create super administrator account
 * 2. Search tokens created within last 24 hours
 * 3. Search tokens created in past week
 * 4. Search tokens updated within specific timeframe
 * 5. Test edge cases (empty date ranges)
 * 6. Validate pagination with date filtering
 */
export async function test_api_super_admin_password_reset_token_date_range_filtering(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create super administrator connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  // Helper function to get date strings
  const now = new Date();
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const lastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);
  const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
  const sixHoursAgo = new Date(now.getTime() - 6 * 60 * 60 * 1000);
  // 2. Search tokens created within last 24 hours
  const last24HoursResult =
    await api.functional.discussionBoard.superAdmin.super_admins.password_resets.index(
      superAdminConnection,
      {
        body: {
          created_at_start: yesterday.toISOString(),
          created_at_end: now.toISOString(),
          limit: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
          >(),
        } satisfies IDiscussionBoardSuperAdminPasswordReset.IRequest,
      },
    );
  typia.assert(last24HoursResult);
  // Validate created_at timestamps are within the last 24 hours
  for (const token of last24HoursResult.data) {
    const createdAt = new Date(token.created_at);
    TestValidator.predicate(
      "created_at within last 24 hours",
      createdAt >= yesterday && createdAt <= now,
    );
  }
  // 3. Search tokens created in past week
  const pastWeekResult =
    await api.functional.discussionBoard.superAdmin.super_admins.password_resets.index(
      superAdminConnection,
      {
        body: {
          created_at_start: lastWeek.toISOString(),
          created_at_end: now.toISOString(),
          limit: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
          >(),
        } satisfies IDiscussionBoardSuperAdminPasswordReset.IRequest,
      },
    );
  typia.assert(pastWeekResult);
  for (const token of pastWeekResult.data) {
    const createdAt = new Date(token.created_at);
    TestValidator.predicate(
      "created_at within past week",
      createdAt >= lastWeek && createdAt <= now,
    );
  }
  // 4. Search tokens updated within specific timeframe (last 2 days)
  const updatedLast2DaysResult =
    await api.functional.discussionBoard.superAdmin.super_admins.password_resets.index(
      superAdminConnection,
      {
        body: {
          updated_at_start: twoDaysAgo.toISOString(),
          updated_at_end: now.toISOString(),
          limit: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
          >(),
        } satisfies IDiscussionBoardSuperAdminPasswordReset.IRequest,
      },
    );
  typia.assert(updatedLast2DaysResult);
  // 5. Test overlapping date filters (created last week but updated recently)
  const overlappingResult =
    await api.functional.discussionBoard.superAdmin.super_admins.password_resets.index(
      superAdminConnection,
      {
        body: {
          created_at_start: threeDaysAgo.toISOString(),
          created_at_end: yesterday.toISOString(),
          updated_at_start: sixHoursAgo.toISOString(),
          updated_at_end: now.toISOString(),
          limit: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
          >(),
        } satisfies IDiscussionBoardSuperAdminPasswordReset.IRequest,
      },
    );
  typia.assert(overlappingResult);
  // 6. Test empty date range (should return all tokens)
  const allTokensResult =
    await api.functional.discussionBoard.superAdmin.super_admins.password_resets.index(
      superAdminConnection,
      {
        body: {
          limit: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
          >(),
        } satisfies IDiscussionBoardSuperAdminPasswordReset.IRequest,
      },
    );
  typia.assert(allTokensResult);
  // 7. Test pagination with date filtering
  const page1Result =
    await api.functional.discussionBoard.superAdmin.super_admins.password_resets.index(
      superAdminConnection,
      {
        body: {
          created_at_start: lastWeek.toISOString(),
          created_at_end: now.toISOString(),
          page: 1,
          limit: 10,
          sort: "created_at_desc",
        } satisfies IDiscussionBoardSuperAdminPasswordReset.IRequest,
      },
    );
  typia.assert(page1Result);
  TestValidator.predicate(
    "page 1 has data or empty",
    page1Result.data.length <= 10,
  );
  // Check if there are more pages by comparing data length with limit
  if (page1Result.data.length === 10) {
    const page2Result =
      await api.functional.discussionBoard.superAdmin.super_admins.password_resets.index(
        superAdminConnection,
        {
          body: {
            created_at_start: lastWeek.toISOString(),
            created_at_end: now.toISOString(),
            page: 2,
            limit: 10,
            sort: "created_at_desc",
          } satisfies IDiscussionBoardSuperAdminPasswordReset.IRequest,
        },
      );
    typia.assert(page2Result);
    TestValidator.predicate(
      "page 2 has data or empty",
      page2Result.data.length <= 10,
    );
    // Verify no overlap between pages
    const page1Ids = new Set(page1Result.data.map((t) => t.id));
    const page2Ids = new Set(page2Result.data.map((t) => t.id));
    TestValidator.predicate(
      "no duplicate tokens across pages",
      !Array.from(page1Ids).some((id) => page2Ids.has(id)),
    );
  }
}