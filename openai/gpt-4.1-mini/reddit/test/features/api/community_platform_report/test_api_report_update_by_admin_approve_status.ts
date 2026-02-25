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

export async function test_api_report_update_by_admin_approve_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin user registration for authorized connection
  const adminConnection: api.IConnection = { host: connection.host };
  const adminJoinOutput = await authorize_admin_join(connection, {});
  adminConnection.headers = {
    Authorization: adminJoinOutput.token.access,
  };
  // 2. Prepare a report update scenario
  // Generate a random UUID to simulate report ID (Replace with actual reportId if exists)
  const reportId = typia.random<string & tags.Format<"uuid">>();
  // 3. Construct update body with status 'approved'
  const updateBody: ICommunityPlatformReport.IUpdate = {
    status: "approved",
    description: RandomGenerator.paragraph({ sentences: 2 }),
  };
  // 4. Attempt update by admin
  const updatedReport =
    await api.functional.communityPlatform.admin.reports.updateReport(
      adminConnection,
      {
        reportId,
        body: updateBody,
      },
    );
  typia.assert(updatedReport);
  // 5. Validate updated status
  TestValidator.equals(
    "report status updated",
    updatedReport.status,
    "approved",
  );
  // 6. Validate reported contents have deletedAt set (i.e., content deleted)
  for (const content of updatedReport.reportedContents) {
    TestValidator.predicate(
      `reported content deleted check: ${content.id}`,
      content.deletedAt !== null && content.deletedAt !== undefined,
    );
  }
  // 7. Attempt update by unauthorized connection and expect error
  await TestValidator.error("unauthorized report update", async () => {
    await api.functional.communityPlatform.admin.reports.updateReport(
      connection,
      {
        reportId,
        body: updateBody,
      },
    );
  });
}
