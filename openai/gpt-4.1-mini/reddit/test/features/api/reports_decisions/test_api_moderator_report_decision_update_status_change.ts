import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import type { ICommunityPlatformReportDecision } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportDecision";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";
import { generate_random_community_platform_moderator_reports_decisions_create_report_decision } from "../../../generate/generate_random_community_platform_moderator_reports_decisions_create_report_decision";
import { generate_random_community_platform_reports_create } from "../../../generate/generate_random_community_platform_reports_create";
import { prepare_random_community_platform_report } from "../../../prepare/prepare_random_community_platform_report";
import { prepare_random_community_platform_report_decision } from "../../../prepare/prepare_random_community_platform_report_decision";

export async function test_api_moderator_report_decision_update_status_change(
  connection: api.IConnection,
): Promise<void> {
  // This scenario tests updating a moderator's report decision status between 'approved' and 'dismissed', validating authorization, correct status update, and error handling for invalid statuses.
  // 1. Moderator joins the platform and gains authorized access.
  // 2. Create a new report by a user (simulated by the moderator connection for simplicity).
  // 3. Moderator creates an initial report decision to approve the report.
  // 4. Update the report decision status to 'dismissed' and verify.
  // 5. Update the report decision status back to 'approved' and verify.
  // 6. Try updating with an invalid status and expect an error.
  const moderatorJoinConnection: api.IConnection = { host: connection.host };
  const moderatorAuth = await authorize_moderator_join(
    moderatorJoinConnection,
    {
      body: {} satisfies ICommunityPlatformModerator.IJoin,
    },
  );
  typia.assert(moderatorAuth);
  const moderatorConnection: api.IConnection = { host: connection.host };
  moderatorConnection.headers = {
    Authorization: `Bearer ${moderatorAuth.token.access}`,
  };
  // Create a new report using the same moderator connection (assuming this is acceptable for test environment)
  const report = await generate_random_community_platform_reports_create(
    moderatorConnection,
    {
      body: {}, // empty object uses default random generation
    },
  );
  typia.assert(report);

  // Use typia.assertGuard to ensure 'id' property exists, if needed just cast for simplicity
  if (!("id" in report)) throw new Error("report must have id property");
  const reportId = report.id as string;

  // Create a new report decision approving the report
  const initialDecision =
    await generate_random_community_platform_moderator_reports_decisions_create_report_decision(
      moderatorConnection,
      {
        body: {
          report_id: reportId,
          decision: "approved",
          comments: "Initial approval",
        },
      },
    );
  typia.assert(initialDecision);
  if (!("id" in initialDecision)) throw new Error("initialDecision must have id property");
  const initialDecisionId = initialDecision.id as string;

  // Update decision status to 'dismissed'
  const updatedDecisionDismissed =
    await api.functional.communityPlatform.moderator.reportsDecisions.updateReportDecision(
      moderatorConnection,
      {
        reportDecisionId: initialDecisionId,
        body: {
          decision: "dismissed",
          comments: "Dismissed after review",
        },
      },
    );
  typia.assert(updatedDecisionDismissed);
  if (!("decision" in updatedDecisionDismissed)) throw new Error("updatedDecisionDismissed must have decision property");

  TestValidator.equals(
    "decision status updated to dismissed",
    updatedDecisionDismissed.decision,
    "dismissed",
  );

  // Update back to 'approved'
  const updatedDecisionApproved =
    await api.functional.communityPlatform.moderator.reportsDecisions.updateReportDecision(
      moderatorConnection,
      {
        reportDecisionId: initialDecisionId,
        body: {
          decision: "approved",
          comments: "Re-approved after appeal",
        },
      },
    );
  typia.assert(updatedDecisionApproved);
  if (!("decision" in updatedDecisionApproved)) throw new Error("updatedDecisionApproved must have decision property");

  TestValidator.equals(
    "decision status updated back to approved",
    updatedDecisionApproved.decision,
    "approved",
  );

  // Attempt invalid status update
  await TestValidator.error("reject invalid decision status", async () => {
    await api.functional.communityPlatform.moderator.reportsDecisions.updateReportDecision(
      moderatorConnection,
      {
        reportDecisionId: initialDecisionId,
        body: {
          decision: "invalid_status" as any, // deliberately invalid
          comments: "Invalid status test",
        },
      },
    );
  });
}
