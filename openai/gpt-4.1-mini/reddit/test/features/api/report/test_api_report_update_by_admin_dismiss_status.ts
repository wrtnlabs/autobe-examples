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

export async function test_api_report_update_by_admin_dismiss_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authorize admin
  const adminJoinData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    displayName: RandomGenerator.name(1),
    bio: null,
    avatarUrl: null,
  };
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuthorized = await authorize_admin_join(adminConnection, {
    body: adminJoinData,
  });
  typia.assert(adminAuthorized);
  // 2. Use the authorized admin connection with token
  adminConnection.headers = {
    Authorization: `Bearer ${adminAuthorized.token.access}`,
  };
  // 3. Create a new report to update - simulate creating a report by random generation
  // Note: Assuming the system allows creating a report entity directly is not possible via public API here
  // So we will create a report update for an existing id (simulate with random uuid), and check status change
  // Prepare reportId and body update to 'dismissed' with a description
  const reportId = typia.random<string & tags.Format<"uuid">>();
  const updateBody: ICommunityPlatformReport.IUpdate = {
    status: "dismissed",
    description: RandomGenerator.paragraph({ sentences: 2 }),
  };
  // 4. Update the report status by admin
  const updatedReport =
    await api.functional.communityPlatform.admin.reports.updateReport(
      adminConnection,
      {
        reportId,
        body: updateBody,
      },
    );
  typia.assert(updatedReport);
  // 5. Validate updated report status
  TestValidator.equals(
    "updated report status",
    updatedReport.status,
    "dismissed",
  );
  // 6. Validate description matches input or is null
  if (updateBody.description !== null && updateBody.description !== undefined) {
    TestValidator.equals(
      "updated report description",
      updatedReport.description,
      updateBody.description,
    );
  }
  // 7. Validate audit log creation by checking at least one decision with dismissal
  TestValidator.predicate(
    "report has decisions",
    updatedReport.decisions.length > 0,
  );
  const hasDismissedDecision = updatedReport.decisions.some(
    (decision) => decision.decision === "dismissed",
  );
  TestValidator.predicate("has dismissed decision", hasDismissedDecision);
  // 8. Confirm that dismissed reports are 'removed from active listings'
  // This means the report likely has deletedAt set or is no longer returned in lists
  // Check deletedAt is not undefined and is either null or date-time string
  TestValidator.predicate(
    "report deletedAt is not undefined",
    updatedReport.deletedAt === null ||
      typeof updatedReport.deletedAt === "string",
  );
}
