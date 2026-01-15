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
import type { ICommunityPlatformReportMetadata } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportMetadata";
import { prepare_random_community_platform_report } from "../../../prepare/prepare_random_community_platform_report";
import { generate_random_community_platform_admin_reports_create } from "../../../generate/generate_random_community_platform_admin_reports_create";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_system_report_creation_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a new connection and authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // Step 2: Create a system report with valid data
  const report = await api.functional.communityPlatform.admin.reports.create(
    adminConnection,
    {
      body: {
        event_type: "content_flag",
        severity: "high",
        content_identifier: typia.random<string & tags.Format<"uuid">>(),
        report_description: RandomGenerator.paragraph({ sentences: 5 }),
      } satisfies ICommunityPlatformReport.ICreate,
    },
  );
  typia.assert(report);
  // Step 3: Validate that required fields are set in response
  const validatedReport = typia.assert<ICommunityPlatformReport>(report);
  TestValidator.predicate(
    "daily_report_rate is non-negative",
    validatedReport.daily_report_rate >= 0,
  );
  TestValidator.predicate(
    "weekly_growth_rate is between -1 and 1",
    validatedReport.weekly_growth_rate >= -1 &&
      validatedReport.weekly_growth_rate <= 1,
  );
  TestValidator.predicate(
    "monthly_growth_rate is between -1 and 1",
    validatedReport.monthly_growth_rate >= -1 &&
      validatedReport.monthly_growth_rate <= 1,
  );
  // Step 4: Verify that admin authentication is required for report creation
  const guestConnection: api.IConnection = { host: connection.host };
  await TestValidator.error("non-admin cannot create report", async () => {
    await api.functional.communityPlatform.admin.reports.create(
      guestConnection,
      {
        body: {
          event_type: "content_flag",
          severity: "high",
          content_identifier: typia.random<string & tags.Format<"uuid">>(),
        } satisfies ICommunityPlatformReport.ICreate,
      },
    );
  });
}
