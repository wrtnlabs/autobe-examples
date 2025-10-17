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
 * Validate that an administrator can create a moderation case and that
 * associated behaviors (linking to a lead report, uniqueness of case_number,
 * and server-side validation) are enforced.
 *
 * Steps:
 *
 * 1. Register a fresh administrator account via POST /auth/administrator/join
 *    (IEconPoliticalForumAdministrator.IJoin ->
 *    IEconPoliticalForumAdministrator.IAuthorized).
 * 2. Create a report via POST /econPoliticalForum/reports to obtain a report id to
 *    reference as lead_report_id.
 * 3. Create a moderation case with a valid payload that includes the
 *    lead_report_id and required fields (case_number, status, priority,
 *    legal_hold). Assert that the returned moderation case contains matching
 *    fields and that assigned_moderator_id is null by default.
 * 4. Attempt to create a second moderation case with the same case_number and
 *    assert that the operation fails (duplicate enforcement).
 * 5. Attempt to create a moderation case with an invalid payload (empty
 *    case_number) and assert that the server rejects it.
 *
 * Notes:
 *
 * - All API responses with bodies are validated using typia.assert().
 * - TestValidator assertions include descriptive titles as required.
 * - Request bodies are constructed with `satisfies` to match DTO types and avoid
 *   any type assertion bypasses.
 */
export async function test_api_moderation_case_create_by_admin(
  connection: api.IConnection,
) {
  // 1) Administrator registration (fresh account)
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminJoinBody = {
    email: adminEmail,
    password: "Str0ngPassw0rd!",
    username: RandomGenerator.name(1),
    display_name: RandomGenerator.name(2),
  } satisfies IEconPoliticalForumAdministrator.IJoin;

  const adminAuth: IEconPoliticalForumAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: adminJoinBody,
    });
  // SDK populates connection.headers.Authorization with token.access
  typia.assert(adminAuth);
  typia.assert(adminAuth.token);

  // 2) Create a report to be used as lead_report_id
  const reportCreateBody = {
    // Provide at least one reported target identifier per API contract
    reported_thread_id: typia.random<string & tags.Format<"uuid">>(),
    reason_code: "harassment",
    reporter_text: RandomGenerator.paragraph({ sentences: 5 }),
    reporter_anonymous: false,
    status: "pending",
    priority: "normal",
  } satisfies IEconPoliticalForumReport.ICreate;

  const createdReport: IEconPoliticalForumReport =
    await api.functional.econPoliticalForum.reports.create(connection, {
      body: reportCreateBody,
    });
  typia.assert(createdReport);
  TestValidator.predicate(
    "report created has id",
    typeof createdReport.id === "string" && createdReport.id.length > 0,
  );

  // 3) Create moderation case using the created report as lead_report_id
  const caseNumber = "CASE-2025-0001"; // realistic human-facing identifier
  const moderationCaseBody = {
    case_number: caseNumber,
    title: "Automated test moderation case",
    lead_report_id: createdReport.id,
    status: "open",
    priority: "normal",
    summary: RandomGenerator.paragraph({ sentences: 6 }),
    legal_hold: false,
  } satisfies IEconPoliticalForumModerationCase.ICreate;

  const createdCase: IEconPoliticalForumModerationCase =
    await api.functional.econPoliticalForum.administrator.moderationCases.create(
      connection,
      {
        body: moderationCaseBody,
      },
    );
  typia.assert(createdCase);

  // API response assertions
  TestValidator.equals(
    "created moderation case has provided case_number",
    createdCase.case_number,
    moderationCaseBody.case_number,
  );
  TestValidator.equals(
    "created moderation case has provided status",
    createdCase.status,
    moderationCaseBody.status,
  );
  TestValidator.equals(
    "created moderation case has provided priority",
    createdCase.priority,
    moderationCaseBody.priority,
  );
  TestValidator.equals(
    "created moderation case references lead_report_id",
    createdCase.lead_report_id,
    createdReport.id,
  );
  TestValidator.equals(
    "assigned_moderator_id is null by default",
    createdCase.assigned_moderator_id,
    null,
  );
  TestValidator.predicate(
    "created moderation case has id",
    typeof createdCase.id === "string" && createdCase.id.length > 0,
  );

  // 6) Edge-failure: Attempt to create duplicate case_number -> expect error
  await TestValidator.error(
    "duplicate case_number should be rejected",
    async () => {
      await api.functional.econPoliticalForum.administrator.moderationCases.create(
        connection,
        {
          body: moderationCaseBody,
        },
      );
    },
  );

  // 7) Edge-failure: Invalid payload (empty case_number) -> expect validation error
  const invalidModerationBody = {
    case_number: "",
    status: "open",
    priority: "normal",
    legal_hold: false,
  } satisfies IEconPoliticalForumModerationCase.ICreate;

  await TestValidator.error(
    "creating moderation case with empty case_number should fail",
    async () => {
      await api.functional.econPoliticalForum.administrator.moderationCases.create(
        connection,
        {
          body: invalidModerationBody,
        },
      );
    },
  );

  // 8) Teardown: soft-delete/cleanup guidance (executed by harness if available)
  // NOTE: The SDK does not provide delete endpoints for moderation cases or
  // reports in the provided materials. Rely on test harness DB reset or
  // administrative cleanup facilities to remove created records.
}
