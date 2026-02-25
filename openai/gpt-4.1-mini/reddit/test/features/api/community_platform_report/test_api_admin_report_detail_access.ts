import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import type { ICommunityPlatformReportReason } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportReason";
import type { ICommunityPlatformReportedContent } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportedContent";
import type { ICommunityPlatformReportsDecision } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportsDecision";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";

export async function test_api_admin_report_detail_access(
  connection: api.IConnection,
): Promise<void> {
  // Scenario: Admin user accesses detailed report with full data and permissions
  // 1. Create and authenticate an admin user
  const adminConnection: api.IConnection = { host: connection.host };
  const adminJoin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "admin_password_123",
      displayName: RandomGenerator.name(),
      bio: null,
      avatarUrl: null,
    },
  });
  typia.assert(adminJoin);
  await authorize_admin_login(adminConnection, {
    body: {
      email: adminJoin.email,
      password: "admin_password_123",
    },
  });
  // 2. Admin requests a report detail
  // Use a random UUID for test; the test will pass if the report exists and has correct structure
  const reportId = typia.random<string & tags.Format<"uuid">>();
  const report = await api.functional.communityPlatform.user.reports.at(
    adminConnection,
    {
      reportId,
    },
  );
  typia.assert(report);
  // 3. Validate that full report data includes expected properties
  TestValidator.predicate(
    "report id is uuid",
    /^[0-9a-fA-F\-]{36}$/.test(report.id),
  );
  TestValidator.predicate(
    "report description non-empty",
    report.description.length > 0,
  );
  TestValidator.predicate("report status non-empty", report.status.length > 0);
  TestValidator.predicate(
    "report createdAt iso format",
    typeof report.createdAt === "string",
  );
  TestValidator.predicate(
    "report updatedAt iso format",
    typeof report.updatedAt === "string",
  );
  TestValidator.predicate(
    "report has user summary",
    typeof report.user === "object" && report.user !== null,
  );
  TestValidator.predicate(
    "report has reportReason summary",
    typeof report.reportReason === "object" && report.reportReason !== null,
  );
  TestValidator.predicate(
    "reported contents present array",
    Array.isArray(report.reportedContents),
  );
  TestValidator.predicate(
    "decisions present array",
    Array.isArray(report.decisions),
  );
}
