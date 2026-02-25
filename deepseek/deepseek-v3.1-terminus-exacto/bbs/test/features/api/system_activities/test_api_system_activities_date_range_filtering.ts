import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorDistributionStatistic";
import type { IDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorPromotionRequest";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import type { IDiscussionBoardSystemActivity } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSystemActivity";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorDistributionStatistic";
import type { IPageIDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorPromotionRequest";
import type { IPageIDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSection";
import type { IPageIDiscussionBoardSystemActivity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSystemActivity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

export async function test_api_system_activities_date_range_filtering(
  connection: api.IConnection,
): Promise<void> {
  // Create super admin connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  typia.assert(authorized);
  // Test 1: Valid date range filtering with pagination
  const now = new Date();
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const twoDaysAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000);
  const validDateRangeResult =
    await api.functional.discussionBoard.superAdmin.system_activities.index(
      superAdminConnection,
      {
        body: {
          created_at_from: twoDaysAgo.toISOString(),
          created_at_to: oneDayAgo.toISOString(),
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardSystemActivity.IRequest,
      },
    );
  typia.assert(validDateRangeResult);
  // Test 2: Empty results for future date range
  const futureDate = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const emptyResult =
    await api.functional.discussionBoard.superAdmin.system_activities.index(
      superAdminConnection,
      {
        body: {
          created_at_from: futureDate.toISOString(),
          created_at_to: new Date(
            futureDate.getTime() + 24 * 60 * 60 * 1000,
          ).toISOString(),
        } satisfies IDiscussionBoardSystemActivity.IRequest,
      },
    );
  typia.assert(emptyResult);
  TestValidator.equals(
    "empty result should have empty data array",
    emptyResult.data.length,
    0,
  );
  // Test 3: Overlapping date ranges
  const overlappingResult =
    await api.functional.discussionBoard.superAdmin.system_activities.index(
      superAdminConnection,
      {
        body: {
          created_at_from: oneDayAgo.toISOString(),
          created_at_to: now.toISOString(),
        } satisfies IDiscussionBoardSystemActivity.IRequest,
      },
    );
  typia.assert(overlappingResult);
  // Test 4: Single day range
  const singleDayResult =
    await api.functional.discussionBoard.superAdmin.system_activities.index(
      superAdminConnection,
      {
        body: {
          created_at_from: oneDayAgo.toISOString(),
          created_at_to: oneDayAgo.toISOString(),
        } satisfies IDiscussionBoardSystemActivity.IRequest,
      },
    );
  typia.assert(singleDayResult);
  // Test 5: Invalid date format handling (should use default behavior)
  const invalidFormatResult =
    await api.functional.discussionBoard.superAdmin.system_activities.index(
      superAdminConnection,
      {
        body: {
          created_at_from: null,
          created_at_to: null,
        } satisfies IDiscussionBoardSystemActivity.IRequest,
      },
    );
  typia.assert(invalidFormatResult);
  // Validate that activities returned in date-filtered results are within the specified timeframe
  if (validDateRangeResult.data.length > 0) {
    for (const activity of validDateRangeResult.data) {
      const activityDate = new Date(activity.created_at);
      TestValidator.predicate(
        "activity should be within date range",
        activityDate >= twoDaysAgo && activityDate <= oneDayAgo,
      );
    }
  }
}
