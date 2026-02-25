import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import type { ICommunityPlatformReportReason } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportReason";
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

export async function test_api_reports_decisions_dismiss_report_as_admin(
  connection: api.IConnection,
): Promise<void> {
  // Description:
  // Test scenario to verify that an authorized admin dismisses a user report.
  // The test includes joining as admin for authentication, then sending a PATCH
  // request with the reportId and decision='dismiss'. The reported content should
  // remain intact, and the report should be removed from active lists.
  // Validate that the decision record reflects 'dismissed' status with optional
  // comments and timestamps. Verify that unauthorized users cannot dismiss reports
  // to ensure secure moderation control.
  // 1. Admin joins to authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "AStr0ngP@ssw0rd!",
      displayName: typia.random<string>(),
      bio: null,
      avatarUrl: null,
    },
  });
  typia.assert(adminAuth);
  adminConnection.headers = {
    Authorization: adminAuth.token.access,
  };
  // 2. Prepare a report to be dismissed
  // Because test scenario states dismissal of an existing report, we create a random reportId
  // Normally, this would come from a created report, but as no utility or create API is given, use random UUID
  const reportId = typia.random<string & tags.Format<"uuid">>();
  // 3. Send PATCH request to dismiss the report with decision='dismiss'
  const decisionBody: ICommunityPlatformReportsDecision.IRequest = {
    reportId,
    decision: "dismiss",
    comment: "Dismissed by admin in test",
  };
  const decision =
    await api.functional.communityPlatform.admin.reports_decisions.updateDecision(
      adminConnection,
      {
        body: decisionBody,
      },
    );
  typia.assert(decision);
  // 4. Validate decision response
  TestValidator.equals("decision status", decision.decision, "dismissed");
  TestValidator.equals("reportId matches", decision.report_id, reportId);
  TestValidator.predicate(
    "moderatorId exists",
    typeof decision.moderator_id === "string" &&
      decision.moderator_id.length > 0,
  );
  TestValidator.predicate(
    "createdAt is valid ISO8601",
    !isNaN(Date.parse(decision.created_at)),
  );
  TestValidator.predicate(
    "updatedAt is valid ISO8601",
    !isNaN(Date.parse(decision.updated_at)),
  );
  TestValidator.predicate(
    "deletedAt is null or valid ISO8601",
    decision.deleted_at === null ||
      !isNaN(Date.parse(decision.deleted_at ?? "")),
  );
  // 5. Attempt to dismiss report with unauthorized user (no auth header)
  const noAuthConnection: api.IConnection = { host: connection.host };
  const invalidBody: ICommunityPlatformReportsDecision.IRequest = {
    reportId,
    decision: "dismiss",
  };
  await TestValidator.error("unauthorized dismiss report attempt", async () => {
    await api.functional.communityPlatform.admin.reports_decisions.updateDecision(
      noAuthConnection,
      {
        body: invalidBody,
      },
    );
  });
}
