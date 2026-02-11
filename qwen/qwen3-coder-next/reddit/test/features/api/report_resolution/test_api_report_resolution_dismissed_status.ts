import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformAdmin";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import type { IRedditPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformReport";
import type { IRedditPlatformReportResolution } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformReportResolution";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_platform_member_reddit_platform_report_resolutions_create } from "../../../generate/generate_random_reddit_platform_member_reddit_platform_report_resolutions_create";
import { generate_random_reddit_platform_member_reddit_platform_reports_create } from "../../../generate/generate_random_reddit_platform_member_reddit_platform_reports_create";
import { prepare_random_reddit_platform_report } from "../../../prepare/prepare_random_reddit_platform_report";
import { prepare_random_reddit_platform_report_resolution } from "../../../prepare/prepare_random_reddit_platform_report_resolution";

export async function test_api_report_resolution_dismissed_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member reporter for submitting report
  const reporterConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(reporterConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(),
    } satisfies IRedditPlatformMember.IJoin,
  });
  // 2. Create report for content requiring review
  // For this test, we'll create a report with a random post ID
  // In real E2E tests, this would be a post created by another user
  const reportBody = {
    reported_type: "POST" as const,
    reported_id: typia.random<string & tags.Format<"uuid">>(),
    reason: RandomGenerator.paragraph({ sentences: 2 }),
  } satisfies IRedditPlatformReport.ICreate;
  const report =
    await api.functional.redditPlatform.member.redditPlatform.reports.create(
      reporterConnection,
      {
        body: reportBody,
      },
    );
  typia.assert(report);
  TestValidator.equals("report has pending status", report.status, "PENDING");
  TestValidator.equals("report type matches", report.reportedType, "POST");
  // 3. Authenticate as admin with resolution authority
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IRedditPlatformAdmin.ILogin,
  });
  // 4. Create report resolution with DISMISSED status
  const resolutionBody = {
    report_id: report.id,
    status: "DISMISSED" as const,
    resolution_notes: RandomGenerator.paragraph({ sentences: 1 }),
  } satisfies IRedditPlatformReportResolution.ICreate;
  const resolution =
    await api.functional.redditPlatform.member.redditPlatform.reportResolutions.create(
      adminConnection,
      {
        body: resolutionBody,
      },
    );
  typia.assert(resolution);
  // 5. Verify resolution and report status
  TestValidator.equals(
    "resolution status is DISMISSED",
    resolution.status,
    "DISMISSED",
  );
  TestValidator.equals(
    "resolution report_id matches",
    resolution.report.id,
    report.id,
  );
  TestValidator.equals(
    "report status should be DISMISSED",
    report.status,
    "DISMISSED",
  );
  TestValidator.predicate(
    "resolution has notes",
    () =>
      resolution.resolution_notes !== null &&
      resolution.resolution_notes !== undefined,
  );
  TestValidator.predicate(
    "resolution has valid timestamp",
    () =>
      resolution.resolved_at !== null && resolution.resolved_at !== undefined,
  );
}