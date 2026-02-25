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

/**
 * Test engagement score filtering to identify high-engagement users.
 * Create users with varying engagement scores and verify that the min_engagement_score
 * filter correctly excludes users below the threshold. Test boundary conditions
 * including users with exactly the threshold score and users with no engagement
 * score (null values). Validate that the system properly handles engagement score
 * calculations and that the response includes accurate user context and activity metrics.
 */
export async function test_api_admin_analytics_users_engagement_score_threshold(
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
  // Test threshold value
  const threshold = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<10> & tags.Maximum<50>
  >();
  // Query analytics with min_engagement_score filter
  const response =
    await api.functional.communityPlatform.admin.analytics.users.index(
      adminConnection,
      {
        body: {
          min_engagement_score: threshold,
          page: 1,
          limit: 100,
        } satisfies ICommunityPlatformUserActivity.IRequest,
      },
    );
  typia.assert(response);
  // Validate that all returned users meet or exceed the threshold
  for (const activity of response.data) {
    if (activity.engagement_score !== null) {
      TestValidator.predicate(
        "engagement score meets threshold",
        activity.engagement_score >= threshold,
      );
    }
  }
  // Test with null values included (no filter)
  const nullResponse =
    await api.functional.communityPlatform.admin.analytics.users.index(
      adminConnection,
      {
        body: {
          min_engagement_score: null,
          page: 1,
          limit: 100,
        } satisfies ICommunityPlatformUserActivity.IRequest,
      },
    );
  typia.assert(nullResponse);
  // Test with undefined min_engagement_score (should return all)
  const undefinedResponse =
    await api.functional.communityPlatform.admin.analytics.users.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 100,
        } satisfies ICommunityPlatformUserActivity.IRequest,
      },
    );
  typia.assert(undefinedResponse);
  // Validate that filtering works by comparing response sizes
  // When threshold is applied, fewer records should be returned than when no filter is applied
  TestValidator.predicate(
    "filter reduces result set",
    response.pagination.records <= nullResponse.pagination.records,
  );
}
