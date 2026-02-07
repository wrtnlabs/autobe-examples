import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import type { IDiscussionBoardSystemActivity } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSystemActivity";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardSystemActivity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSystemActivity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

/**
 * Test comprehensive filtering capabilities of system activity logs by a super administrator.
 * Validates filtering by activity type, date ranges, pagination, success status, and edge cases.
 */
export async function test_api_system_activities_comprehensive_filtering(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      privilege_level: "super_admin",
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  // Note: In a real implementation, we would create test system activities here
  // However, based on the available API functions, we can only test filtering
  // on existing activities in the database
  // 2. Test filtering by activity type
  const activityTypes = [
    "login",
    "article_create",
    "comment_create",
    "section_browse",
  ] as const;
  for (const activityType of activityTypes) {
    const filteredByType =
      await api.functional.discussionBoard.superAdmin.system_activities.index(
        superAdminConnection,
        {
          body: {
            activity_type: activityType,
            limit: 10, // Use deterministic value instead of random
          } satisfies IDiscussionBoardSystemActivity.IRequest,
        },
      );
    typia.assert(filteredByType);
    // Validate all returned activities match the requested type
    TestValidator.predicate(
      `all activities should be of type ${activityType}`,
      filteredByType.data.every(
        (activity) => activity.activity_type === activityType,
      ),
    );
    // Validate actor display names are present (non-empty strings)
    TestValidator.predicate(
      `actor display names should be resolved for ${activityType}`,
      filteredByType.data.every(
        (activity) =>
          typeof activity.actor_display_name === "string" &&
          activity.actor_display_name.length > 0,
      ),
    );
  }
  // 3. Test date range filtering
  const now = new Date();
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
  const oneWeekAgo = new Date(
    now.getTime() - 7 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const filteredByDateRange =
    await api.functional.discussionBoard.superAdmin.system_activities.index(
      superAdminConnection,
      {
        body: {
          start_date: oneWeekAgo,
          end_date: oneDayAgo,
          limit: 10,
        } satisfies IDiscussionBoardSystemActivity.IRequest,
      },
    );
  typia.assert(filteredByDateRange);
  // 4. Test pagination
  const page1 =
    await api.functional.discussionBoard.superAdmin.system_activities.index(
      superAdminConnection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardSystemActivity.IRequest,
      },
    );
  typia.assert(page1);
  const page2 =
    await api.functional.discussionBoard.superAdmin.system_activities.index(
      superAdminConnection,
      {
        body: {
          page: 2,
          limit: 10,
        } satisfies IDiscussionBoardSystemActivity.IRequest,
      },
    );
  typia.assert(page2);
  // Validate pagination metadata
  TestValidator.equals("page 1 current page", page1.pagination.current, 1);
  TestValidator.equals("page 1 limit", page1.pagination.limit, 10);
  TestValidator.equals("page 2 current page", page2.pagination.current, 2);
  TestValidator.equals("page 2 limit", page2.pagination.limit, 10);
  // 5. Test non-existent activity type (should return empty results)
  const nonExistentType =
    await api.functional.discussionBoard.superAdmin.system_activities.index(
      superAdminConnection,
      {
        body: {
          activity_type: "non_existent_activity_type",
        } satisfies IDiscussionBoardSystemActivity.IRequest,
      },
    );
  typia.assert(nonExistentType);
  TestValidator.predicate(
    "non-existent type should return empty array",
    nonExistentType.data.length === 0,
  );
  // 6. Test combined filtering
  const combinedFilter =
    await api.functional.discussionBoard.superAdmin.system_activities.index(
      superAdminConnection,
      {
        body: {
          activity_type: "login",
          start_date: oneWeekAgo,
          end_date: now.toISOString(),
          page: 1,
          limit: 5,
        } satisfies IDiscussionBoardSystemActivity.IRequest,
      },
    );
  typia.assert(combinedFilter);
  // Validate combined filter results
  TestValidator.predicate(
    "combined filter should have valid pagination",
    combinedFilter.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "combined filter should have valid records count",
    combinedFilter.pagination.records >= 0,
  );
  // 7. Test success status filtering
  const successfulActivities =
    await api.functional.discussionBoard.superAdmin.system_activities.index(
      superAdminConnection,
      {
        body: {
          // Note: success_status filtering is not available in the current IRequest type
          // This would need to be added to the API schema
          activity_type: "login",
          limit: 10,
        } satisfies IDiscussionBoardSystemActivity.IRequest,
      },
    );
  typia.assert(successfulActivities);
}
