import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import type { ICommunityPlatformReportEscalation } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportEscalation";

/**
 * Validate that an authenticated administrator can update report escalation
 * records correctly.
 *
 * Test workflow:
 *
 * 1. Create an administrator (admin1) using /auth/administrator/join
 * 2. Authenticate as that admin (via join response)
 * 3. Create a new report escalation via
 *    /communityPlatform/administrator/reportEscalations
 * 4. Update the escalation using
 *    /communityPlatform/administrator/reportEscalations/{id} (modify
 *    escalation_reason and escalation_status)
 * 5. Create a second administrator (admin2)
 * 6. Assign the escalation to admin2 using update endpoint
 * 7. Validate that the record is updated as requested—including audit fields,
 *    escalation_reason, status, and assignment.
 */
export async function test_api_report_escalation_update_by_administrator(
  connection: api.IConnection,
) {
  // 1. Create administrator #1 and authenticate (admin1)
  const admin1Email = typia.random<string & tags.Format<"email">>();
  const admin1Password = RandomGenerator.alphaNumeric(12);
  const admin1 = await api.functional.auth.administrator.join(connection, {
    body: {
      email: admin1Email,
      password: admin1Password,
    } satisfies ICommunityPlatformAdministrator.ICreate,
  });
  typia.assert(admin1);
  const admin1Id = admin1.id;

  // 2. Create a new report escalation as admin1
  const reportId = typia.random<string & tags.Format<"uuid">>();
  const escalationReason1 = RandomGenerator.paragraph({ sentences: 2 });
  const escalationStatus1 = "in_progress";
  const escalation =
    await api.functional.communityPlatform.administrator.reportEscalations.create(
      connection,
      {
        body: {
          report_id: reportId,
          escalation_reason: escalationReason1,
          escalation_status: escalationStatus1,
        } satisfies ICommunityPlatformReportEscalation.ICreate,
      },
    );
  typia.assert(escalation);
  TestValidator.equals(
    "escalation created for correct report",
    escalation.report.id,
    reportId,
  );
  TestValidator.equals(
    "first escalation_reason set",
    escalation.escalation_reason,
    escalationReason1,
  );
  TestValidator.equals(
    "first status set",
    escalation.escalation_status,
    escalationStatus1,
  );

  // 3. Update the escalation's reason and status
  const escalationReason2 = RandomGenerator.paragraph({ sentences: 3 });
  const escalationStatus2 = "resolved";
  const updatedEscalation1 =
    await api.functional.communityPlatform.administrator.reportEscalations.update(
      connection,
      {
        reportEscalationId: escalation.id,
        body: {
          escalation_reason: escalationReason2,
          escalation_status: escalationStatus2,
        } satisfies ICommunityPlatformReportEscalation.IUpdate,
      },
    );
  typia.assert(updatedEscalation1);
  TestValidator.equals(
    "escalation_reason updated",
    updatedEscalation1.escalation_reason,
    escalationReason2,
  );
  TestValidator.equals(
    "escalation_status updated",
    updatedEscalation1.escalation_status,
    escalationStatus2,
  );
  TestValidator.equals(
    "assigned admin unchanged after update",
    updatedEscalation1.escalated_to_administrator?.id ?? null,
    escalation.escalated_to_administrator?.id ?? null,
  );
  TestValidator.notEquals(
    "updated_at field must be different after update",
    updatedEscalation1.updated_at,
    escalation.updated_at,
  );

  // 4. Create administrator #2 and authenticate (admin2)
  const admin2Email = typia.random<string & tags.Format<"email">>();
  const admin2Password = RandomGenerator.alphaNumeric(12);
  const admin2 = await api.functional.auth.administrator.join(connection, {
    body: {
      email: admin2Email,
      password: admin2Password,
    } satisfies ICommunityPlatformAdministrator.ICreate,
  });
  typia.assert(admin2);

  // 5. Assign the escalation to admin2
  const updatedEscalation2 =
    await api.functional.communityPlatform.administrator.reportEscalations.update(
      connection,
      {
        reportEscalationId: escalation.id,
        body: {
          escalated_to_administrator_id: admin2.id,
        } satisfies ICommunityPlatformReportEscalation.IUpdate,
      },
    );
  typia.assert(updatedEscalation2);
  TestValidator.equals(
    "escalation assignment to admin2",
    updatedEscalation2.escalated_to_administrator?.id,
    admin2.id,
  );
  TestValidator.equals(
    "escalation_reason unchanged in assignment update",
    updatedEscalation2.escalation_reason,
    updatedEscalation1.escalation_reason,
  );
  TestValidator.equals(
    "escalation_status unchanged in assignment update",
    updatedEscalation2.escalation_status,
    updatedEscalation1.escalation_status,
  );
  TestValidator.equals(
    "report linkage unchanged after assignment",
    updatedEscalation2.report.id,
    escalation.report.id,
  );
  TestValidator.notEquals(
    "updated_at changes after assignment update",
    updatedEscalation2.updated_at,
    updatedEscalation1.updated_at,
  );
}
