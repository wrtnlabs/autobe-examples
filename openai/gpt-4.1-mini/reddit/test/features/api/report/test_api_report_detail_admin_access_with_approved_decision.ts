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

export async function test_api_report_detail_admin_access_with_approved_decision(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection and authorize admin join
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {});
  adminConnection.headers = {
    Authorization: `Bearer ${admin.token.access}`,
  };
  // Generate a random UUID for reportId
  const reportId = typia.random<string & tags.Format<"uuid">>();
  // Retrieve the report detail as admin
  const report = await api.functional.communityPlatform.admin.reports.at(
    adminConnection,
    {
      reportId,
    },
  );
  // Assert report fields
  typia.assert(report);
  TestValidator.equals("report status", report.status, "approved");
  // Check moderator decisions array has at least one approved decision
  TestValidator.predicate(
    "has approved decision",
    Array.isArray(report.decisions) &&
      report.decisions.some((d) => d.decision === "approved"),
  );
  // Check decisions contain valid moderator comments (null or string)
  for (const decision of report.decisions ?? []) {
    TestValidator.predicate(
      "decision is approved or dismissed",
      decision.decision === "approved" || decision.decision === "dismissed",
    );
    if (decision.decision === "approved") {
      TestValidator.predicate(
        "moderator comment is nullable string",
        decision.comments === null || typeof decision.comments === "string",
      );
    }
  }
  // Validate report includes linked entities
  typia.assert(report.user);
  typia.assert(report.reportReason);
  typia.assert(Array.isArray(report.reportedContents));
  // Confirm only admin can access the report
  // Try access with no authorization header
  const noAuthConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError("unauthorized access", 401, async () => {
    await api.functional.communityPlatform.admin.reports.at(noAuthConnection, {
      reportId,
    });
  });
}
