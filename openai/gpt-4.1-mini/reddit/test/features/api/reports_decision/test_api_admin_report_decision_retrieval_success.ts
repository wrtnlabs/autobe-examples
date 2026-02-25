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

export async function test_api_admin_report_decision_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // 0. Prepare admin user and join
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuthorized = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "StrongP@ssw0rd",
      displayName: RandomGenerator.name(),
      bio: null,
      avatarUrl: null,
    },
  });
  // 1. Create a fake report decision ID for test - random ID
  const reportDecisionId = typia.random<string & tags.Format<"uuid">>();
  // 2. Retrieve report decision details
  const reportDecision =
    await api.functional.communityPlatform.admin.reports_decisions.at(
      adminConnection,
      { id: reportDecisionId },
    );
  // 3. Validate entire response structure
  typia.assert(reportDecision);
  // 4. Validate required fields
  TestValidator.predicate(
    "decision is approved or dismissed",
    () =>
      reportDecision.decision === "approved" ||
      reportDecision.decision === "dismissed",
  );
  // 5. Validate related references
  typia.assert(reportDecision.report);
  typia.assert(reportDecision.moderator);
  // 6. Validate timestamps format as ISO strings
  [
    reportDecision.created_at,
    reportDecision.updated_at,
    reportDecision.deleted_at,
    reportDecision.report.created_at,
    reportDecision.report.updated_at,
    reportDecision.report.deleted_at,
  ].forEach((timestamp) => {
    if (timestamp !== null) {
      TestValidator.predicate(
        "valid ISO 8601 datetime",
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/.test(timestamp),
      );
    }
  });
}
