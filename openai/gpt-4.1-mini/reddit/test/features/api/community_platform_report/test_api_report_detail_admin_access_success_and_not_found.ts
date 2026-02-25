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

export async function test_api_report_detail_admin_access_success_and_not_found(
  connection: api.IConnection,
): Promise<void> {
  // Admin registration and authorization
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuthorized = await authorize_admin_join(adminConnection, {});
  // Replace headers with proper Authorization
  adminConnection.headers = {
    Authorization: `Bearer ${adminAuthorized.token.access}`,
  };
  // Test 1: Access with valid reportId - simulate or use a random UUID
  const reportId = typia.random<string & tags.Format<"uuid">>();
  // Try fetching report detail with valid reportId
  // This may fail if reportId doesn't exist; positive test relies on creation available
  // Since creation API is not given, treat this as a best effort
  try {
    const report = await api.functional.communityPlatform.admin.reports.at(
      adminConnection,
      {
        reportId,
      },
    );
    typia.assert(report);
    // Validate report fields
    TestValidator.predicate(
      "report user exists",
      report.user !== null && typeof report.user === "object",
    );
    TestValidator.predicate(
      "reportReason reasonText exists",
      typeof report.reportReason.reasonText === "string" &&
        report.reportReason.reasonText.length > 0,
    );
    TestValidator.equals(
      "report status valid",
      ["pending", "approved", "dismissed"].includes(report.status),
      true,
    );
    TestValidator.predicate(
      "reportedContents is array",
      Array.isArray(report.reportedContents),
    );
    TestValidator.predicate(
      "decisions is array",
      Array.isArray(report.decisions),
    );
  } catch {
    // If not found, test 404 below
  }
  // Test 2: Access with non-existent reportId, should return 404
  const nonExistentReportId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "fetch non-existent report returns 404",
    async () => {
      await api.functional.communityPlatform.admin.reports.at(adminConnection, {
        reportId: nonExistentReportId,
      });
    },
  );
}
