import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import type { ICommunityPlatformReportEscalation } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportEscalation";

/**
 * Test enforcement of uniqueness constraint for escalations per report.
 *
 * 1. Register administrator A and authenticate
 * 2. Generate a new, unique report (simulate a real referenced report, but only id
 *    is needed)
 * 3. Administrator A creates escalation for the report
 * 4. Register administrator B and authenticate
 * 5. Attempt to create a second escalation for the same report (simulates a
 *    different admin or reassignment or API abuse)
 * 6. Assert the second creation fails with business logic error (enforcement of
 *    unique per report)
 */
export async function test_api_report_escalation_creation_duplicate_constraint(
  connection: api.IConnection,
) {
  // 1. Register administrator A
  const emailAdminA = typia.random<string & tags.Format<"email">>();
  const adminA = await api.functional.auth.administrator.join(connection, {
    body: {
      email: emailAdminA,
      password: RandomGenerator.alphaNumeric(12),
    } satisfies ICommunityPlatformAdministrator.ICreate,
  });
  typia.assert(adminA);

  // 2. Generate mock report summary (reference)
  const reportSummary: ICommunityPlatformReport.ISummary = {
    id: typia.random<string & tags.Format<"uuid">>(),
  };

  // 3. Administrator A creates escalation
  const escalationBody = {
    report_id: reportSummary.id,
    escalation_reason: RandomGenerator.paragraph(),
    escalation_status: "in_progress",
    escalated_to_administrator_id: adminA.id,
  } satisfies ICommunityPlatformReportEscalation.ICreate;

  const createdEscalation =
    await api.functional.communityPlatform.administrator.reportEscalations.create(
      connection,
      {
        body: escalationBody,
      },
    );
  typia.assert(createdEscalation);
  TestValidator.equals(
    "escalation links to referenced report",
    createdEscalation.report.id,
    reportSummary.id,
  );
  if (createdEscalation.escalated_to_administrator) {
    TestValidator.equals(
      "escalation assigned to initial admin",
      createdEscalation.escalated_to_administrator.id,
      adminA.id,
    );
  }
  TestValidator.equals(
    "escalation reason matches",
    createdEscalation.escalation_reason,
    escalationBody.escalation_reason,
  );
  TestValidator.equals(
    "escalation status matches",
    createdEscalation.escalation_status,
    escalationBody.escalation_status,
  );

  // 4. Register administrator B
  const emailAdminB = typia.random<string & tags.Format<"email">>();
  const adminB = await api.functional.auth.administrator.join(connection, {
    body: {
      email: emailAdminB,
      password: RandomGenerator.alphaNumeric(12),
    } satisfies ICommunityPlatformAdministrator.ICreate,
  });
  typia.assert(adminB);

  // 5. Attempt duplicate escalation by admin B on same report
  const duplicateEscalationBody = {
    report_id: reportSummary.id,
    escalation_reason: RandomGenerator.paragraph(),
    escalation_status: "in_progress",
    escalated_to_administrator_id: adminB.id,
  } satisfies ICommunityPlatformReportEscalation.ICreate;

  await TestValidator.error(
    "should reject duplicate escalation for same report",
    async () => {
      await api.functional.communityPlatform.administrator.reportEscalations.create(
        connection,
        {
          body: duplicateEscalationBody,
        },
      );
    },
  );
}
