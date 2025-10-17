import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconPoliticalForumAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumAdministrator";
import type { IEconPoliticalForumModerationCase } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumModerationCase";
import type { IEconPoliticalForumRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumRegisteredUser";
import type { IEconPoliticalForumReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumReport";

/**
 * Validate that an administrator can update a moderation case successfully.
 *
 * Workflow:
 *
 * 1. Administrator registers (join) and receives authorization tokens.
 * 2. (Optional) Create a public report to be used as lead_report_id.
 * 3. Create a moderation case as administrator.
 * 4. Update the moderation case (status, owner_admin_id, lead_report_id,
 *    legal_hold, summary).
 * 5. Assert that returned moderation case reflects updates and updated_at
 *    advanced.
 *
 * Notes:
 *
 * - This test relies on the test DB lifecycle to clean created data; no explicit
 *   delete performed here.
 * - Audit and moderation log verification is not possible with the provided SDK
 *   (no read endpoints); therefore the test verifies observable resource state
 *   only.
 */
export async function test_api_moderation_case_update_by_administrator_success(
  connection: api.IConnection,
) {
  // 1. Administrator registration (join)
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const admin: IEconPoliticalForumAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password: "StrongPass123", // satisfies MinLength<10>
        username: RandomGenerator.alphaNumeric(8),
        display_name: RandomGenerator.name(2),
      } satisfies IEconPoliticalForumAdministrator.IJoin,
    });
  typia.assert(admin);

  // typia.assert ensures admin.id and admin.token exist
  TestValidator.predicate(
    "administrator authorized token present",
    typeof admin.token?.access === "string" && admin.token.access.length > 0,
  );

  // 2. Optional: create a report to use as lead_report_id
  const reportBody = {
    reason_code: "harassment",
    reported_thread_id: typia.random<string & tags.Format<"uuid">>(),
    reporter_anonymous: true,
    reporter_text: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies IEconPoliticalForumReport.ICreate;

  const report: IEconPoliticalForumReport =
    await api.functional.econPoliticalForum.reports.create(connection, {
      body: reportBody,
    });
  typia.assert(report);

  // 3. Create moderation case (administrator context)
  const caseNumber = `CASE-${RandomGenerator.alphaNumeric(6).toUpperCase()}`;
  const createBody = {
    case_number: caseNumber,
    title: `Automated test case ${caseNumber}`,
    status: "open",
    priority: "normal",
    summary: "Initial case created by e2e test",
    lead_report_id: report.id,
    legal_hold: false,
  } satisfies IEconPoliticalForumModerationCase.ICreate;

  const createdCase: IEconPoliticalForumModerationCase =
    await api.functional.econPoliticalForum.administrator.moderationCases.create(
      connection,
      {
        body: createBody,
      },
    );
  typia.assert(createdCase);

  // Basic sanity checks on created case
  TestValidator.equals(
    "case number matches request",
    createdCase.case_number,
    createBody.case_number,
  );
  TestValidator.equals(
    "initial status is open",
    createdCase.status,
    createBody.status,
  );

  // 4. Update moderation case
  const updateBody = {
    status: "investigating",
    owner_admin_id: admin.id,
    lead_report_id: report.id,
    summary: "Investigation started by automated test",
    legal_hold: true,
    closed_at: null,
  } satisfies IEconPoliticalForumModerationCase.IUpdate;

  const updatedCase: IEconPoliticalForumModerationCase =
    await api.functional.econPoliticalForum.administrator.moderationCases.update(
      connection,
      {
        caseId: createdCase.id,
        body: updateBody,
      },
    );
  typia.assert(updatedCase);

  // 5. Business validations
  TestValidator.equals(
    "status updated to investigating",
    updatedCase.status,
    updateBody.status,
  );
  TestValidator.equals(
    "owner_admin_id recorded",
    updatedCase.owner_admin_id,
    updateBody.owner_admin_id,
  );
  TestValidator.equals(
    "lead_report_id recorded",
    updatedCase.lead_report_id,
    updateBody.lead_report_id,
  );

  // updated_at should be later than createdCase.updated_at (or created_at)
  const prev = createdCase.updated_at ?? createdCase.created_at;
  TestValidator.predicate(
    "updated_at advanced",
    new Date(updatedCase.updated_at).getTime() >= new Date(prev).getTime(),
  );

  // Note: Audit-log and moderation-log assertions cannot be performed because
  // the provided SDK does not expose read endpoints for audit logs or moderation logs.
  // Those checks should be implemented when suitable read endpoints are available.

  // Teardown: rely on the test framework's DB reset between tests.
}
