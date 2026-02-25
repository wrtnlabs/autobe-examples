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

export async function test_api_platform_admin_report_analytics_summary(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_platform_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
    } satisfies IRedditCommunityPlatformAdmin.IJoin,
  });
  typia.assert(admin);
  // Use authenticated admin connection to fetch report analytics
  const analytics =
    await api.functional.redditCommunity.platformAdmin.admin.reports.analytics.search(
      adminConnection,
    );
  typia.assert(analytics);
  // Validate response structure
  TestValidator.predicate("total pending >= 0", analytics.total_pending >= 0);
  TestValidator.predicate("total approved >= 0", analytics.total_approved >= 0);
  TestValidator.predicate(
    "total dismissed >= 0",
    analytics.total_dismissed >= 0,
  );
  TestValidator.predicate(
    "avg resolution hours >= 0",
    analytics.avg_resolution_hours >= 0,
  );
}
