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

export async function test_api_admin_user_activities_engagement_metrics(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      permissions_level: null,
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  // Test engagement score filtering with different thresholds
  const mediumScore = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<31> & tags.Maximum<70>
  >();
  const highScore = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<71> & tags.Maximum<100>
  >();
  // Test minimum engagement score filter
  const minScoreResponse =
    await api.functional.communityPlatform.admin.user_activities.index(
      adminConnection,
      {
        body: {
          min_engagement_score: mediumScore,
          limit: 10,
          page: 1,
        } satisfies ICommunityPlatformUserActivity.IRequest,
      },
    );
  typia.assert(minScoreResponse);
  // Validate that all returned activities meet or exceed the minimum score
  if (minScoreResponse.data.length > 0) {
    minScoreResponse.data.forEach((activity) => {
      if (activity.engagement_score !== null) {
        TestValidator.predicate(
          "engagement score meets minimum threshold",
          activity.engagement_score >= mediumScore,
        );
      }
    });
  }
  // Test content_created filter with true value
  const contentCreatedResponse =
    await api.functional.communityPlatform.admin.user_activities.index(
      adminConnection,
      {
        body: {
          content_created: true,
          limit: 10,
          page: 1,
        } satisfies ICommunityPlatformUserActivity.IRequest,
      },
    );
  typia.assert(contentCreatedResponse);
  // Validate that all returned activities have content_created = true
  if (contentCreatedResponse.data.length > 0) {
    contentCreatedResponse.data.forEach((activity) => {
      TestValidator.predicate(
        "activity has content created",
        activity.content_created === true,
      );
    });
  }
  // Test content_created filter with false value
  const noContentResponse =
    await api.functional.communityPlatform.admin.user_activities.index(
      adminConnection,
      {
        body: {
          content_created: false,
          limit: 10,
          page: 1,
        } satisfies ICommunityPlatformUserActivity.IRequest,
      },
    );
  typia.assert(noContentResponse);
  // Validate that all returned activities have content_created = false
  if (noContentResponse.data.length > 0) {
    noContentResponse.data.forEach((activity) => {
      TestValidator.predicate(
        "activity has no content created",
        activity.content_created === false,
      );
    });
  }
  // Test content_created filter with null value (all activities)
  const allContentResponse =
    await api.functional.communityPlatform.admin.user_activities.index(
      adminConnection,
      {
        body: {
          content_created: null,
          limit: 10,
          page: 1,
        } satisfies ICommunityPlatformUserActivity.IRequest,
      },
    );
  typia.assert(allContentResponse);
  // Test combined filters: engagement score and content creation
  const combinedResponse =
    await api.functional.communityPlatform.admin.user_activities.index(
      adminConnection,
      {
        body: {
          min_engagement_score: highScore,
          content_created: true,
          limit: 10,
          page: 1,
        } satisfies ICommunityPlatformUserActivity.IRequest,
      },
    );
  typia.assert(combinedResponse);
  // Validate combined filter results
  if (combinedResponse.data.length > 0) {
    combinedResponse.data.forEach((activity) => {
      TestValidator.predicate(
        "activity has high engagement score and content created",
        activity.content_created === true &&
          activity.engagement_score !== null &&
          activity.engagement_score >= highScore,
      );
    });
  }
  // Test pagination metadata - business logic validation
  TestValidator.predicate(
    "pagination current page is valid",
    combinedResponse.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit is within bounds",
    combinedResponse.pagination.limit >= 1 &&
      combinedResponse.pagination.limit <= 100,
  );
  TestValidator.predicate(
    "pagination total records is non-negative",
    combinedResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination total pages is non-negative",
    combinedResponse.pagination.pages >= 0,
  );
  // Validate user attribution in activity summaries - business logic
  if (combinedResponse.data.length > 0) {
    combinedResponse.data.forEach((activity) => {
      TestValidator.predicate(
        "user has valid ID format",
        activity.user.id.length > 0,
      );
      TestValidator.predicate(
        "user has non-empty username",
        activity.user.username.length > 0,
      );
    });
  }
}
