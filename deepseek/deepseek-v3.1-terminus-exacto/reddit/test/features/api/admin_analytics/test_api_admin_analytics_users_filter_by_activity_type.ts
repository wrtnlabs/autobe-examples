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

export async function test_api_admin_analytics_users_filter_by_activity_type(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      permissions_level: null,
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  // Test filtering by each activity type
  const activityTypes = [
    "login",
    "post_create",
    "comment_create",
    "vote",
  ] as const;
  for (const activityType of activityTypes) {
    // Filter analytics by specific activity type
    const response =
      await api.functional.communityPlatform.admin.analytics.users.index(
        adminConnection,
        {
          body: {
            activity_type: activityType,
            page: 1,
            limit: 10,
          } satisfies ICommunityPlatformUserActivity.IRequest,
        },
      );
    typia.assert(response);
    // Validate pagination metadata
    TestValidator.predicate(
      `pagination should exist for ${activityType} filter`,
      response.pagination !== undefined,
    );
    TestValidator.equals(
      `current page should be 1 for ${activityType} filter`,
      response.pagination.current,
      1,
    );
    TestValidator.predicate(
      `limit should be positive for ${activityType} filter`,
      response.pagination.limit > 0,
    );
    TestValidator.predicate(
      `records count should be non-negative for ${activityType} filter`,
      response.pagination.records >= 0,
    );
    TestValidator.predicate(
      `pages count should be non-negative for ${activityType} filter`,
      response.pagination.pages >= 0,
    );
    // Validate pagination calculation
    if (response.pagination.records > 0) {
      TestValidator.predicate(
        `pages should be calculated correctly for ${activityType} filter`,
        response.pagination.pages ===
          Math.ceil(response.pagination.records / response.pagination.limit),
      );
    }
    // Validate data structure
    TestValidator.predicate(
      `data should be array for ${activityType} filter`,
      Array.isArray(response.data),
    );
    // Validate each activity record matches the filter
    for (const activity of response.data) {
      TestValidator.equals(
        `activity type should match filter ${activityType}`,
        activity.activity_type,
        activityType,
      );
      // Validate user context exists (typia.assert already validated all properties)
      TestValidator.predicate(
        `user should exist for activity ${activity.id}`,
        activity.user !== undefined,
      );
    }
  }
  // Test filtering with non-existent activity type
  const nonExistentResponse =
    await api.functional.communityPlatform.admin.analytics.users.index(
      adminConnection,
      {
        body: {
          activity_type: "non_existent_activity_type",
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformUserActivity.IRequest,
      },
    );
  typia.assert(nonExistentResponse);
  // Non-existent activity type should return empty results or filtered appropriately
  TestValidator.predicate(
    "response should be valid for non-existent activity type",
    nonExistentResponse.pagination !== undefined,
  );
  // Test filtering with multiple criteria
  const combinedResponse =
    await api.functional.communityPlatform.admin.analytics.users.index(
      adminConnection,
      {
        body: {
          activity_type: "login",
          content_created: false,
          min_engagement_score: 0,
          page: 1,
          limit: 5,
        } satisfies ICommunityPlatformUserActivity.IRequest,
      },
    );
  typia.assert(combinedResponse);
  // Validate combined filter results
  TestValidator.predicate(
    "combined filter should return valid pagination",
    combinedResponse.pagination !== undefined,
  );
  TestValidator.equals(
    "combined filter should have page 1",
    combinedResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "combined filter should have limit 5",
    combinedResponse.pagination.limit,
    5,
  );
}
