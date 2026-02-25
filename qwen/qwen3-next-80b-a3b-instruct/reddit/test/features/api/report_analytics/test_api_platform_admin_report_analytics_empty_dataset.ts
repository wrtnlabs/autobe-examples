import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPlatformAdmin";
import type { IRedditCommunityReportAnalytic } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityReportAnalytic";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_platform_admin_join } from "../../../authorize/authorize_platform_admin_join";
import { authorize_platform_admin_login } from "../../../authorize/authorize_platform_admin_login";
import { authorize_platform_admin_refresh } from "../../../authorize/authorize_platform_admin_refresh";

export async function test_api_platform_admin_report_analytics_empty_dataset(
  connection: api.IConnection,
): Promise<void> {
  // Create platform admin connection
  const adminConnection: api.IConnection = { host: connection.host };
  // Register a new platform admin account
  const admin = await authorize_platform_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
    },
  });
  typia.assert(admin);
  // Use admin connection to call analytics endpoint
  const analytics =
    await api.functional.redditCommunity.platformAdmin.admin.reports.analytics.search(
      adminConnection,
    );
  typia.assert(analytics);
  // Validate all metrics are zero and avg_resolution_hours is null for empty dataset
  TestValidator.equals("total_pending should be 0", analytics.total_pending, 0);
  TestValidator.equals(
    "total_approved should be 0",
    analytics.total_approved,
    0,
  );
  TestValidator.equals(
    "total_dismissed should be 0",
    analytics.total_dismissed,
    0,
  );
  TestValidator.equals(
    "avg_resolution_hours should be null",
    analytics.avg_resolution_hours,
    null,
  );
}
