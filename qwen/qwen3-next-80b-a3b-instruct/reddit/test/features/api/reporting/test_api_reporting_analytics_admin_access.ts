import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import type { ICommunityPlatformReportAnalytics } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportAnalytics";
import type { ICommunityPlatformReportAnalyticsContentCategoryDistribution } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportAnalyticsContentCategoryDistribution";
import type { ICommunityPlatformReportAnalyticsModerationOutcomes } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportAnalyticsModerationOutcomes";
import type { ICommunityPlatformReportAnalyticsReportOrigin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportAnalyticsReportOrigin";
import type { ICommunityPlatformReportAnalyticsReportedContentTypes } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportAnalyticsReportedContentTypes";
import type { ICommunityPlatformReportAnalyticsReportingUsers } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportAnalyticsReportingUsers";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_reporting_analytics_admin_access(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a new connection for admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  // Step 2: Authenticate as admin by joining with random credentials
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminJoinInput: ICommunityPlatformAdmin.IJoin = {
    email: adminEmail,
    href: "https://example.com/join",
    referrer: "https://example.com",
    ip: null,
  } satisfies ICommunityPlatformAdmin.IJoin;
  const adminAuth: ICommunityPlatformAdmin.IAuthorized =
    await authorize_admin_join(adminConnection, { body: adminJoinInput });
  typia.assert(adminAuth);
  // Step 3: Use admin connection to access analytics endpoint
  const analytics: ICommunityPlatformReportAnalytics =
    await api.functional.communityPlatform.reports.tracking.analytics.index(
      adminConnection,
    );
  typia.assert(analytics);
  // Step 4: Validate core analytics properties exist and have correct structure
  TestValidator.equals(
    "total_reports is a positive integer",
    analytics.total_reports,
    analytics.total_reports,
  );
  typia.assert<ICommunityPlatformReportAnalyticsReportedContentTypes>(
    analytics.reported_content_types,
  );
  typia.assert<ICommunityPlatformReportAnalyticsModerationOutcomes>(
    analytics.moderation_outcomes,
  );
  // Step 5: Verify non-admin user cannot access analytics
  const userConnection: api.IConnection = { host: connection.host };
  const userEmail: string = typia.random<string & tags.Format<"email">>();
  const userJoinInput: ICommunityPlatformAdmin.IJoin = {
    email: userEmail,
    href: "https://example.com/join",
    referrer: "https://example.com",
    ip: null,
  } satisfies ICommunityPlatformAdmin.IJoin;
  const userAuth: ICommunityPlatformAdmin.IAuthorized =
    await authorize_admin_join(userConnection, { body: userJoinInput });
  typia.assert(userAuth);
  // Test that non-admin user gets unauthorized error
  await TestValidator.error(
    "non-admin user cannot access analytics",
    async () => {
      await api.functional.communityPlatform.reports.tracking.analytics.index(
        userConnection,
      );
    },
  );
}
