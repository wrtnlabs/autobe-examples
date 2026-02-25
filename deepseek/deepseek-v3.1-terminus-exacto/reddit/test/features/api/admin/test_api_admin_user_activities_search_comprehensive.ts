import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import type { ICommunityPlatformUserActivity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUserActivity";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformUserActivity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformUserActivity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_user_activities_search_comprehensive(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection
  const adminConnection: api.IConnection = { host: connection.host };
  // Authenticate as admin
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      permissions_level: null,
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // Note: Since we cannot create actual user activities through the available API functions
  // (only admin user activities search endpoint is available), we'll test the search
  // functionality with the existing data in the system
  // Test empty search (should return all activities)
  const emptySearch =
    await api.functional.communityPlatform.admin.user_activities.index(
      adminConnection,
      {
        body: {} satisfies ICommunityPlatformUserActivity.IRequest,
      },
    );
  typia.assert(emptySearch);
  TestValidator.predicate(
    "empty search returns pagination info",
    emptySearch.pagination.records >= 0,
  );
  // Test pagination parameters
  const paginatedSearch =
    await api.functional.communityPlatform.admin.user_activities.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformUserActivity.IRequest,
      },
    );
  typia.assert(paginatedSearch);
  TestValidator.equals("page limit", paginatedSearch.pagination.limit, 10);
  TestValidator.equals("current page", paginatedSearch.pagination.current, 1);
  // Test date range filtering
  const startDate = new Date(
    Date.now() - 7 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const endDate = new Date().toISOString();
  const dateRangeSearch =
    await api.functional.communityPlatform.admin.user_activities.index(
      adminConnection,
      {
        body: {
          start_date: startDate,
          end_date: endDate,
        } satisfies ICommunityPlatformUserActivity.IRequest,
      },
    );
  typia.assert(dateRangeSearch);
  // Test content created filter
  const contentCreatedSearch =
    await api.functional.communityPlatform.admin.user_activities.index(
      adminConnection,
      {
        body: {
          content_created: true,
        } satisfies ICommunityPlatformUserActivity.IRequest,
      },
    );
  typia.assert(contentCreatedSearch);
  // Test engagement score threshold
  const engagementSearch =
    await api.functional.communityPlatform.admin.user_activities.index(
      adminConnection,
      {
        body: {
          min_engagement_score: 10,
        } satisfies ICommunityPlatformUserActivity.IRequest,
      },
    );
  typia.assert(engagementSearch);
  // Test combination of multiple filters
  const combinedSearch =
    await api.functional.communityPlatform.admin.user_activities.index(
      adminConnection,
      {
        body: {
          start_date: startDate,
          end_date: endDate,
          content_created: true,
          min_engagement_score: 5,
          page: 1,
          limit: 5,
        } satisfies ICommunityPlatformUserActivity.IRequest,
      },
    );
  typia.assert(combinedSearch);
  TestValidator.equals(
    "combined search page limit",
    combinedSearch.pagination.limit,
    5,
  );
  TestValidator.equals(
    "combined search current page",
    combinedSearch.pagination.current,
    1,
  );
  // Validate that all returned activities have proper user context
  if (combinedSearch.data.length > 0) {
    const activity = combinedSearch.data[0];
    TestValidator.predicate("activity has user", activity.user !== null);
    TestValidator.predicate("user has id", activity.user.id !== undefined);
    TestValidator.predicate(
      "user has username",
      activity.user.username !== undefined,
    );
  }
  // Test activity type filtering (if we had sample data with known activity types)
  // This would require creating activities with specific types first
  const activityTypeSearch =
    await api.functional.communityPlatform.admin.user_activities.index(
      adminConnection,
      {
        body: {
          activity_type: "login", // Example activity type
        } satisfies ICommunityPlatformUserActivity.IRequest,
      },
    );
  typia.assert(activityTypeSearch);
}
