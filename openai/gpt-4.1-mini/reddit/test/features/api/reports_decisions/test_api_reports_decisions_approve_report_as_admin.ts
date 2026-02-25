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

export async function test_api_reports_decisions_approve_report_as_admin(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin registration and authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuthorized = await authorize_admin_join(adminConnection, {
    body: {
      email: `approve.report.admin.${Date.now()}@test.com`,
      password: "strong-password",
      displayName: "ApproveReportAdmin",
      bio: null,
      avatarUrl: null,
    },
  });
  adminConnection.headers = {
    ...adminConnection.headers,
    Authorization: adminAuthorized.token.access,
  };
  // 2. Prepare an existing pending report ID to approve -
  // since no direct report creation or retrieval API provided,
  // we will generate a random UUID for the reportId as simulation
  // In real scenario, should retrieve pending report from DB or API
  const reportId = typia.random<string & tags.Format<"uuid">>();
  // 3. Approve report decision via PATCH request
  const decisionRequest: ICommunityPlatformReportsDecision.IRequest = {
    reportId: reportId,
    decision: "approve",
    comment: "Automated approval for testing",
    page: undefined,
    limit: undefined,
  };
  const decisionResponse: ICommunityPlatformReportsDecision =
    await api.functional.communityPlatform.admin.reports_decisions.updateDecision(
      adminConnection,
      {
        body: decisionRequest,
      },
    );
  // 4. Validate response type correctness
  typia.assert(decisionResponse);
  // 5. Validate decision response values
  TestValidator.equals(
    "decision is approved",
    decisionResponse.decision,
    "approved",
  );
  TestValidator.equals(
    "decision report ID matches request",
    decisionResponse.report_id,
    reportId,
  );
  TestValidator.predicate(
    "response createdAt timestamp present",
    typeof decisionResponse.created_at === "string" &&
      decisionResponse.created_at.length > 0,
  );
  TestValidator.predicate(
    "response updatedAt timestamp present",
    typeof decisionResponse.updated_at === "string" &&
      decisionResponse.updated_at.length > 0,
  );
  TestValidator.predicate(
    "deletedAt is null",
    decisionResponse.deleted_at === null,
  );
  // 6. Additional validation about reported content deletion
  // cannot validate directly because no direct API access or DB access
  // skip this step in e2e test
  // 7. Verify unauthorized user cannot approve report
  const unauthorizedConnection: api.IConnection = { host: connection.host };
  await TestValidator.error("unauthorized approval attempt", async () => {
    await api.functional.communityPlatform.admin.reports_decisions.updateDecision(
      unauthorizedConnection,
      {
        body: decisionRequest,
      },
    );
  });
}
