import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformAdmin";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import type { IRedditPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformReport";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { generate_random_reddit_platform_admin_reddit_platform_reports_create } from "../../../generate/generate_random_reddit_platform_admin_reddit_platform_reports_create";
import { prepare_random_reddit_platform_report } from "../../../prepare/prepare_random_reddit_platform_report";

export async function test_api_report_post_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin user through registration
  const adminConnection: api.IConnection = { host: connection.host };
  const adminUser = await api.functional.redditPlatform.auth.admin.join(
    adminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "Admin1234!@#$",
        username: RandomGenerator.name(),
        display_name: RandomGenerator.name(),
        bio: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies IRedditPlatformAdmin.IJoin,
    },
  );
  typia.assert(adminUser);
  // 2. Admin reports a post with valid reason
  // Note: In a real scenario, we would first create a post to report,
  // but since post creation endpoint is not available, we use a
  // pre-seeded post ID from the test environment. For this test,
  // we'll assume a valid post exists with ID 'test-post-id'.
  const report =
    await api.functional.redditPlatform.admin.redditPlatform.reports.create(
      adminConnection,
      {
        body: {
          reported_type: "POST",
          reported_id: "00000000-0000-0000-0000-000000000000" as string &
            tags.Format<"uuid">,
          reason:
            "This post contains inappropriate content that violates community guidelines.",
        } satisfies IRedditPlatformReport.ICreate,
      },
    );
  typia.assert(report);
  // 3. Validate report structure
  TestValidator.equals("report has correct ID", typeof report.id, "string");
  TestValidator.equals("report has correct status", report.status, "PENDING");
  TestValidator.equals("report has correct type", report.reportedType, "POST");
  TestValidator.equals(
    "report has correct target ID",
    report.reportedId,
    "00000000-0000-0000-0000-000000000000",
  );
  TestValidator.equals(
    "report has correct reason",
    report.reason,
    "This post contains inappropriate content that violates community guidelines.",
  );
  TestValidator.equals(
    "report has reporter info",
    typeof report.reporterId,
    "string",
  );
  TestValidator.equals(
    "report has reporter summary",
    typeof report.reporter.id,
    "string",
  );
  TestValidator.equals(
    "report has reporter username",
    typeof report.reporter.username,
    "string",
  );
  TestValidator.equals(
    "report has correct created timestamp",
    typeof report.createdAt,
    "string",
  );
  TestValidator.equals(
    "report has correct updated timestamp",
    typeof report.updatedAt,
    "string",
  );
}
