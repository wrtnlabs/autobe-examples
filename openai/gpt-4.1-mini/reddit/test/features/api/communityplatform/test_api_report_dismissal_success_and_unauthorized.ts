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

export async function test_api_report_dismissal_success_and_unauthorized(
  connection: api.IConnection,
): Promise<void> {
  // Scenario 1: Successfully dismiss a report as admin
  const adminConnection: api.IConnection = { host: connection.host };
  // Admin join and authenticate
  const adminAuthorized = await authorize_admin_join(adminConnection, {});
  typia.assert(adminAuthorized);
  // Generate a random valid UUID as reportId (simulate existing active report)
  const reportId = typia.random<string & tags.Format<"uuid">>();
  // Perform dismiss operation
  const dismissedReport =
    await api.functional.communityPlatform.admin.reports.dismiss(
      adminConnection,
      { reportId },
    );
  typia.assert(dismissedReport);
  // Validate status is 'dismissed'
  TestValidator.equals(
    "report status after dismiss",
    dismissedReport.status,
    "dismissed",
  );
  // Scenario 2: Attempt to dismiss a report without admin authorization
  await TestValidator.httpError(
    "unauthorized dismiss should fail",
    403,
    async () => {
      await api.functional.communityPlatform.admin.reports.dismiss(connection, {
        reportId,
      });
    },
  );
}
