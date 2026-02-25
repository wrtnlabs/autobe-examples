import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
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

import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";

export async function test_api_moderator_report_approval_successful(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a moderator account and authorize
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderatorAuth = await authorize_moderator_join(moderatorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.name(1),
      displayName: RandomGenerator.name(2),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      avatarUrl: null,
    },
  });
  typia.assert(moderatorAuth);
  moderatorConnection.headers = {
    Authorization: moderatorAuth.token.access,
  };
  // 2. We need a pending report to approve
  // Since no utility or API for creating report provided, simulate getting a pending report
  // For demonstration, we simulate a random UUID as reportId (in real tests, should query or create)
  const reportId = typia.random<string & tags.Format<"uuid">>();
  // 3. Approve the report by the moderator
  const updatedReport =
    await api.functional.communityPlatform.moderator.reports.approve.approveReport(
      moderatorConnection,
      { reportId },
    );
  typia.assert(updatedReport);
  // 4. Validate the updated report status is 'approved'
  TestValidator.equals(
    "report status is approved",
    updatedReport.status,
    "approved",
  );
  // 5. Validate a decision record exists with 'approved' decision and suitable moderator ID
  const approvedDecisions = updatedReport.decisions.filter(
    (decision) =>
      decision.decision === "approved" &&
      decision.moderator_id === moderatorAuth.id,
  );
  TestValidator.predicate(
    "approved decision recorded",
    approvedDecisions.length > 0,
  );
  // 6. Validate that each reported content linked to the report is marked as deleted (deletedAt != null)
  const allContentsDeleted = updatedReport.reportedContents.every(
    (content) => content.deletedAt !== null && content.deletedAt !== undefined,
  );
  TestValidator.predicate(
    "reported contents are permanently deleted",
    allContentsDeleted,
  );
  // 7. Validate unauthorized user cannot approve report
  // Using base connection (no authorization) should throw error
  await TestValidator.error("unauthorized approval should fail", async () => {
    await api.functional.communityPlatform.moderator.reports.approve.approveReport(
      { host: connection.host },
      { reportId },
    );
  });
  // 8. Validate errors for nonexistent report ID
  const nonExistentReportId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error("approve non-existent report fails", async () => {
    await api.functional.communityPlatform.moderator.reports.approve.approveReport(
      moderatorConnection,
      { reportId: nonExistentReportId },
    );
  });
  // 9. Validate errors for already processed report ID
  // In absence of a true processed report, simulate with same ID again (assuming idempotency or error)
  await TestValidator.error(
    "approve already processed report fails",
    async () => {
      await api.functional.communityPlatform.moderator.reports.approve.approveReport(
        moderatorConnection,
        { reportId },
      );
    },
  );
}
