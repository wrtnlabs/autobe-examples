import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformSystemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSystemSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformSystemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformSystemSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_analytics_health_performance_metrics(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection
  const adminConnection: api.IConnection = { host: connection.host };
  // Authenticate as admin
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      permissions_level: null,
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  // Test performance metrics filtering with average response time thresholds
  const performanceResponse =
    await api.functional.communityPlatform.admin.analytics.health.index(
      adminConnection,
      {
        body: {
          avg_response_time_min: typia.random<number & tags.Minimum<0>>() satisfies number as number,
          avg_response_time_max: typia.random<number & tags.Minimum<100>>() satisfies number as number,
          error_rate_min: typia.random<
            number & tags.Minimum<0> & tags.Maximum<100>
          >() satisfies number as number,
          error_rate_max: typia.random<
            number & tags.Minimum<0> & tags.Maximum<100>
          >() satisfies number as number,
          engagement_rate_min: typia.random<
            number & tags.Minimum<0> & tags.Maximum<100>
          >() satisfies number as number,
          engagement_rate_max: typia.random<
            number & tags.Minimum<0> & tags.Maximum<100>
          >() satisfies number as number,
          snapshot_period: RandomGenerator.pick(["daily", "weekly", "monthly"]),
          page: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>() satisfies number as number,
          limit: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
          >() satisfies number as number,
          sort_by: "engagement_rate",
          sort_order: "desc",
        } satisfies ICommunityPlatformSystemSnapshot.IRequest,
      },
    );
  typia.assert(performanceResponse);
  // Test with specific snapshot period
  const periodResponse =
    await api.functional.communityPlatform.admin.analytics.health.index(
      adminConnection,
      {
        body: {
          snapshot_period: "daily",
          engagement_rate_min: 50,
          engagement_rate_max: 100,
        } satisfies ICommunityPlatformSystemSnapshot.IRequest,
      },
    );
  typia.assert(periodResponse);
  // Test empty response scenario with high thresholds
  const emptyResponse =
    await api.functional.communityPlatform.admin.analytics.health.index(
      adminConnection,
      {
        body: {
          engagement_rate_min: 100,
          engagement_rate_max: 100,
        } satisfies ICommunityPlatformSystemSnapshot.IRequest,
      },
    );
  typia.assert(emptyResponse);
}