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

export async function test_api_moderator_report_update_approval_flow(
  connection: api.IConnection,
): Promise<void> {
  // 1. Moderator join and authentication
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderatorAuth = await authorize_moderator_join(moderatorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.name(),
      displayName: null,
      bio: null,
      avatarUrl: null,
    },
  });
  typia.assert(moderatorAuth);
  moderatorConnection.headers = {
    Authorization: `Bearer ${moderatorAuth.token.access}`,
  };
  // 2. Create a sample report to update manually via the test backend admin tools or simulate
  // Since we don't have creation API, simulate a random report for testing approval
  // The report must have at least one reportedContents item (simulate at least 1 content to be deleted)
  const reportToApprove = typia.random<ICommunityPlatformReport>();
  // Make sure the report has at least one reportedContent
  if (reportToApprove.reportedContents.length === 0) {
    reportToApprove.reportedContents.push({
      id: typia.random<string & tags.Format<"uuid">>(),
      communityPlatformReportId: null,
      communityPlatformReportedPostId: null,
      communityPlatformReportedCommentId: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      deletedAt: null,
    });
  }
  // 3. Prepare the update data for status to 'approved' with optional description
  const updateBody: ICommunityPlatformReport.IUpdate = {
    status: "approved",
    description: RandomGenerator.paragraph({ sentences: 3 }),
  };
  // 4. Call updateReport API using utility function with moderator authentication
  const updatedReport =
    await api.functional.communityPlatform.moderator.reports.updateReport(
      moderatorConnection,
      {
        reportId: reportToApprove.id,
        body: updateBody,
      },
    );
  typia.assert(updatedReport);
  // 5. Validate the report status updated
  TestValidator.equals(
    "Report status updated to approved",
    updatedReport.status,
    "approved",
  );
  // 6. Validate reportedContents are marked as deleted
  for (const content of updatedReport.reportedContents) {
    TestValidator.predicate(
      `Reported content ${content.id} marked deleted`,
      content.deletedAt !== null && content.deletedAt !== undefined,
    );
  }
  // 7. Validate decisions include new decision with approved status by the moderator
  const decisionByModerator = updatedReport.decisions.find(
    (dec) =>
      dec.moderator_id === moderatorAuth.id && dec.decision === "approved",
  );
  TestValidator.predicate(
    "Decision with approved status by moderator exists",
    decisionByModerator !== undefined,
  );
  // 8. Validate decision's timestamps
  if (decisionByModerator) {
    TestValidator.predicate(
      "Decision created_at is ISO string",
      !isNaN(Date.parse(decisionByModerator.created_at)),
    );
    TestValidator.predicate(
      "Decision updated_at is ISO string",
      !isNaN(Date.parse(decisionByModerator.updated_at)),
    );
  }
  // 9. Authorization test: Attempt updating report without token results in error
  const unauthConnection: api.IConnection = { host: connection.host };
  await TestValidator.error(
    "Unauthorized report update should fail",
    async () => {
      await api.functional.communityPlatform.moderator.reports.updateReport(
        unauthConnection,
        {
          reportId: reportToApprove.id,
          body: updateBody,
        },
      );
    },
  );
}
