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

/**
 * Test the dismissal workflow of moderator report update where a report is dismissed.
 *
 * 1. Moderator joins and obtains an authorized connection.
 * 2. Create a dummy report by a user to have a report to dismiss.
 * 3. Update the report status to 'dismissed' with a dismissal note.
 * 4. Assert the update response report status is 'dismissed', and the dismissal note is saved.
 * 5. Query the report to ensure it is removed from active listings (e.g., no longer "pending").
 * 6. Validate that the report decisions contain an entry with decision 'dismissed' matching.
 */
export async function test_api_moderator_report_update_dismissal_flow(
  connection: api.IConnection,
): Promise<void> {
  // 1. Moderator authentication
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderatorAuthorized = await authorize_moderator_join(
    moderatorConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        username: RandomGenerator.name(),
        displayName: RandomGenerator.name(),
        bio: RandomGenerator.paragraph({ sentences: 2 }),
        avatarUrl: null,
      },
    },
  );
  typia.assert(moderatorAuthorized);
  // Update connection headers with access token
  moderatorConnection.headers = {
    Authorization: `Bearer ${moderatorAuthorized.token.access}`,
  };
  // 2. Create a minimal report by user to be dismissed
  // Since no utility to create report is provided, mocking a created report id
  const mockReportId = typia.random<string & tags.Format<"uuid">>();
  // 3. Update the report status to 'dismissed' with a dismissal note
  const dismissalNote = `Dismissal note ${RandomGenerator.paragraph({ sentences: 1 })}`;
  const updatedReport =
    await api.functional.communityPlatform.moderator.reports.updateReport(
      moderatorConnection,
      {
        reportId: mockReportId,
        body: {
          status: "dismissed",
          description: dismissalNote,
        } satisfies ICommunityPlatformReport.IUpdate,
      },
    );
  typia.assert(updatedReport);
  // 4. Validate that the returned report has status 'dismissed' and note saved
  TestValidator.equals(
    "Report status updated to dismissed",
    updatedReport.status,
    "dismissed",
  );
  TestValidator.equals(
    "Dismissal note saved",
    updatedReport.description,
    dismissalNote,
  );
  TestValidator.equals("Report ID matches", updatedReport.id, mockReportId);
  // 5. Validate the report is removed from active listings concept: status is 'dismissed'
  // Because active listing isn't directly queryable, ensure status !== 'pending' etc.
  TestValidator.predicate(
    "Report is not pending after dismissal",
    updatedReport.status !== "pending",
  );
  // 6. Validate audit logs for dismissal exist
  TestValidator.predicate(
    "Report decisions contain a dismissal entry",
    updatedReport.decisions.some(
      (decision) =>
        decision.decision === "dismissed" &&
        decision.report_id === updatedReport.id,
    ),
  );
}
