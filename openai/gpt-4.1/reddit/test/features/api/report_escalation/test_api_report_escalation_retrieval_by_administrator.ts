import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import type { ICommunityPlatformReportEscalation } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportEscalation";

/**
 * Validates that an authenticated administrator can successfully retrieve a
 * specific report escalation by its unique ID.
 *
 * Step-by-step process:
 *
 * 1. Register a new administrator for authentication context.
 * 2. Create a report escalation (requires a report_id reference – use a random
 *    valid uuid for the test schema).
 * 3. Retrieve the created report escalation by ID as the administrator.
 * 4. Validate that all required escalation details (report reference, escalation
 *    reason, status, optional administrator assignment, created_at, updated_at)
 *    are present and correct.
 * 5. Confirm access is possible only as an authenticated administrator (optionally
 *    try with an unauthenticated connection to ensure access control, but main
 *    flow validates positive access).
 */
export async function test_api_report_escalation_retrieval_by_administrator(
  connection: api.IConnection,
) {
  // 1. Register and authenticate as a new administrator
  const adminAuth: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<string & tags.Format<"password">>(),
        business_status: null,
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(adminAuth);

  // 2. Create a report escalation (simulate a valid report id)
  const report_id: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const escalationCreate = {
    report_id,
    escalation_reason: RandomGenerator.paragraph({ sentences: 4 }),
    escalation_status: "in_progress",
    escalated_to_administrator_id: adminAuth.id,
  } satisfies ICommunityPlatformReportEscalation.ICreate;

  const escalation: ICommunityPlatformReportEscalation =
    await api.functional.communityPlatform.administrator.reportEscalations.create(
      connection,
      {
        body: escalationCreate,
      },
    );
  typia.assert(escalation);

  // 3. Retrieve the created report escalation by ID
  const retrieved: ICommunityPlatformReportEscalation =
    await api.functional.communityPlatform.administrator.reportEscalations.at(
      connection,
      {
        reportEscalationId: escalation.id,
      },
    );
  typia.assert(retrieved);

  // 4. Validate required fields
  TestValidator.equals(
    "report escalation id matches",
    retrieved.id,
    escalation.id,
  );
  TestValidator.equals(
    "report reference id matches",
    retrieved.report.id,
    report_id,
  );
  TestValidator.equals(
    "escalation reason matches",
    retrieved.escalation_reason,
    escalationCreate.escalation_reason,
  );
  TestValidator.equals(
    "escalation status matches",
    retrieved.escalation_status,
    escalationCreate.escalation_status,
  );
  TestValidator.equals(
    "administrator assignment present",
    retrieved.escalated_to_administrator?.id,
    adminAuth.id,
  );
  TestValidator.predicate(
    "created_at is present",
    typeof retrieved.created_at === "string" && !!retrieved.created_at,
  );
  TestValidator.predicate(
    "updated_at is present",
    typeof retrieved.updated_at === "string" && !!retrieved.updated_at,
  );
}
