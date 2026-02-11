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
import { generate_random_reddit_platform_member_reddit_platform_reports_create } from "../../../generate/generate_random_reddit_platform_member_reddit_platform_reports_create";
import { prepare_random_reddit_platform_report } from "../../../prepare/prepare_random_reddit_platform_report";

export async function test_api_report_resolution_status_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register member to submit a report
  const memberConnection: api.IConnection = { host: connection.host };
  const memberProfile = await api.functional.redditPlatform.auth.member.join(
    memberConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        username: RandomGenerator.name(),
      } satisfies IRedditPlatformMember.IJoin,
    },
  );
  typia.assert(memberProfile);
  memberConnection.headers = { Authorization: memberProfile.token.access };
  // 2. Register admin to resolve the report
  const adminConnection: api.IConnection = { host: connection.host };
  const adminProfile = await api.functional.redditPlatform.auth.admin.join(
    adminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        username: RandomGenerator.name(),
        display_name: null,
        bio: null,
      } satisfies IRedditPlatformAdmin.IJoin,
    },
  );
  typia.assert(adminProfile);
  adminConnection.headers = { Authorization: adminProfile.token.access };
  // 3. Member creates a report for a comment
  // Note: In a real scenario, we would create a comment first, but for this test we'll use a valid UUID
  const report =
    await api.functional.redditPlatform.member.redditPlatform.reports.create(
      memberConnection,
      {
        body: {
          reported_type: "COMMENT" as const,
          reported_id: "00000000-0000-0000-0000-000000000001" as string &
            tags.Format<"uuid">,
          reason: "This comment contains inappropriate content",
        } satisfies IRedditPlatformReport.ICreate,
      },
    );
  typia.assert(report);
  // 4. Admin resolves the report by approving it
  const resolution =
    await api.functional.redditPlatform.admin.redditPlatform.reports.resolutions.update(
      adminConnection,
      {
        reportId: report.id,
        body: {
          status: "RESOLVED" as const,
          resolution_notes:
            "Comment removed for violating community guidelines",
        } satisfies IRedditPlatformReportResolution.IUpdate,
      },
    );
  typia.assert(resolution);
  // 5. Retrieve the resolved report
  const retrievedReport =
    await api.functional.redditPlatform.admin.redditPlatform.reports.at(
      adminConnection,
      {
        reportId: report.id,
      },
    );
  typia.assert(retrievedReport);
  // 6. Validate resolution metadata
  TestValidator.equals(
    "report status is APPROVED",
    retrievedReport.status,
    "APPROVED",
  );
  TestValidator.notEquals(
    "resolvedAt is set for resolved report",
    retrievedReport.resolvedAt,
    null,
  );
  TestValidator.equals(
    "resolvedBy admin information is available",
    retrievedReport.resolvedBy?.id,
    adminProfile.id,
  );
  TestValidator.equals(
    "resolvedBy username matches admin",
    retrievedReport.resolvedBy?.username,
    adminProfile.username,
  );
  void TestValidator.predicate(
    "resolution timestamp is valid ISO string",
    () =>
      typeof retrievedReport.resolvedAt === "string" &&
      !isNaN(Date.parse(retrievedReport.resolvedAt)),
  );
}
