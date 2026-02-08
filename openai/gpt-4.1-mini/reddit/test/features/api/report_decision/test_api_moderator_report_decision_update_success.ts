import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import type { ICommunityPlatformReportDecision } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportDecision";
import { TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { generate_random_community_platform_moderator_reports_decisions_create_report_decision } from "../../../generate/generate_random_community_platform_moderator_reports_decisions_create_report_decision";
import { generate_random_community_platform_reports_create } from "../../../generate/generate_random_community_platform_reports_create";

export async function test_api_moderator_report_decision_update_success(
  connection: api.IConnection,
): Promise<void> {
  // Moderator joins to obtain authorization token
  const moderatorConnection: api.IConnection = { host: connection.host };
  const joinBody: ICommunityPlatformModerator.IJoin = {};
  const joinOutput = await authorize_moderator_join(moderatorConnection, {
    body: joinBody,
  });
  moderatorConnection.headers = { Authorization: joinOutput.token.access };

  // Create a user report to be decided on
  const report: ICommunityPlatformReport =
    await generate_random_community_platform_reports_create(
      moderatorConnection,
      { body: {} },
    );
  typia.assert(report);

  // Create initial report decision with valid decision enum value
  const reportDecision: ICommunityPlatformReportDecision =
    await generate_random_community_platform_moderator_reports_decisions_create_report_decision(
      moderatorConnection,
      {
        body: {
          decision: "approved",
          comments: "Initial decision",
          report_id: "00000000-0000-0000-0000-000000000000",
          moderator_id: typia.random<string & tags.Format<"uuid">>(),
        },
      },
    );
  typia.assert(reportDecision);

  // Update: dismiss with new comment
  const updateBodyDismiss: ICommunityPlatformReportDecision.IUpdate = {
    decision: "dismissed",
    comments: "Dismissed after reconsideration",
  };

  // Call updateReportDecision and assert result
  const updatedDismiss =
    await api.functional.communityPlatform.moderator.reportsDecisions.updateReportDecision(
      moderatorConnection,
      {
        reportDecisionId: "00000000-0000-0000-0000-000000000000",
        body: updateBodyDismiss,
      },
    );
  typia.assert(updatedDismiss);

  // Update: approve with null comment
  const updateBodyApprove: ICommunityPlatformReportDecision.IUpdate = {
    decision: "approved",
    comments: null,
  };

  // Call updateReportDecision and assert result
  const updatedApprove =
    await api.functional.communityPlatform.moderator.reportsDecisions.updateReportDecision(
      moderatorConnection,
      {
        reportDecisionId: "00000000-0000-0000-0000-000000000000",
        body: updateBodyApprove,
      },
    );
  typia.assert(updatedApprove);
}
