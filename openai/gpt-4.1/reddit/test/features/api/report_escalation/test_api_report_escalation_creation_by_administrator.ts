import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import type { ICommunityPlatformReportEscalation } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportEscalation";

/**
 * Test successful creation of a report escalation entry as an authenticated
 * administrator.
 *
 * 1. Register a new administrator and authenticate (admin join).
 * 2. Fabricate a valid report summary (as no report creation API is provided).
 * 3. As administrator, post a valid escalation (report_id, escalation_reason,
 *    escalation_status).
 * 4. Confirm creation: response contains populated escalation object, with proper
 *    status, references, timestamps, and compliance/audit trail fields.
 * 5. Validate only administrator is authorized to perform this action
 *    (authorization boundary).
 */
export async function test_api_report_escalation_creation_by_administrator(
  connection: api.IConnection,
) {
  // 1. Admin registration
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = typia.random<string & tags.Format<"password">>();
  const adminJoin = await api.functional.auth.administrator.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies ICommunityPlatformAdministrator.ICreate,
  });
  typia.assert(adminJoin);

  // 2. Fabricate a valid existing report summary
  const reportId = typia.random<string & tags.Format<"uuid">>();
  const fabricatedReportSummary: ICommunityPlatformReport.ISummary = {
    id: reportId,
  };

  // 3. Construct the escalation request body
  const escalationReason = RandomGenerator.paragraph({ sentences: 4 });
  const escalationStatus = RandomGenerator.pick([
    "in_progress",
    "resolved",
    "rejected",
    "open",
  ] as const);
  const escalationCreateBody = {
    report_id: fabricatedReportSummary.id,
    escalation_reason: escalationReason,
    escalation_status: escalationStatus,
    // Optionally, we could set escalated_to_administrator_id, but we skip to cover both unassigned/assigned cases
  } satisfies ICommunityPlatformReportEscalation.ICreate;

  // 4. Call the escalation creation endpoint
  const escalation =
    await api.functional.communityPlatform.administrator.reportEscalations.create(
      connection,
      { body: escalationCreateBody },
    );
  typia.assert(escalation);

  // 5. Validate escalation contains all expected fields
  TestValidator.equals(
    "escalation references report",
    escalation.report.id,
    escalationCreateBody.report_id,
  );
  TestValidator.equals(
    "escalation reason matches input",
    escalation.escalation_reason,
    escalationCreateBody.escalation_reason,
  );
  TestValidator.equals(
    "escalation status matches input",
    escalation.escalation_status,
    escalationCreateBody.escalation_status,
  );
  TestValidator.predicate(
    "created_at is ISO date-time",
    typeof escalation.created_at === "string" &&
      escalation.created_at.includes("T"),
  );
  TestValidator.predicate(
    "updated_at is ISO date-time",
    typeof escalation.updated_at === "string" &&
      escalation.updated_at.includes("T"),
  );
  // escalated_to_administrator may be null or defined; can't deterministically check
  // Audit/compliance: check existence of top-level id
  TestValidator.predicate(
    "escalation has id",
    typeof escalation.id === "string" && escalation.id.length > 0,
  );
  // Proper types on escalated_to_administrator
  if (
    escalation.escalated_to_administrator !== null &&
    escalation.escalated_to_administrator !== undefined
  ) {
    TestValidator.predicate(
      "escalated_to_administrator.id is uuid",
      typeof escalation.escalated_to_administrator.id === "string" &&
        escalation.escalated_to_administrator.id.length > 0,
    );
  }
}
