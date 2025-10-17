import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconPoliticalForumAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumAdministrator";
import type { IEconPoliticalForumModerationCase } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumModerationCase";
import type { IEconPoliticalForumModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumModerator";
import type { IEconPoliticalForumRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumRegisteredUser";
import type { IEconPoliticalForumReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumReport";

export async function test_api_moderation_case_update_by_moderator(
  connection: api.IConnection,
) {
  // 1) Prepare isolated connections for admin and moderator so tokens do not collide
  const adminConn: api.IConnection = { ...connection, headers: {} };
  const modConn: api.IConnection = { ...connection, headers: {} };
  const unauthConn: api.IConnection = { ...connection, headers: {} };

  // 2) Admin: join
  const adminPayload = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "StrongP@ssw0rd2025",
    username: RandomGenerator.name(1),
  } satisfies IEconPoliticalForumAdministrator.IJoin;
  const admin: IEconPoliticalForumAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(adminConn, {
      body: adminPayload,
    });
  typia.assert(admin);
  TestValidator.predicate(
    "admin token exists after join",
    !!admin.token?.access,
  );

  // 3) Moderator: join (separate session)
  const modPayload = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: "ModP@ssw0rd2025",
  } satisfies IEconPoliticalForumModerator.ICreate;
  const moderator: IEconPoliticalForumModerator.IAuthorized =
    await api.functional.auth.moderator.join(modConn, {
      body: modPayload,
    });
  typia.assert(moderator);
  TestValidator.predicate(
    "moderator token exists after join",
    !!moderator.token?.access,
  );

  // 4) Using admin session create a report to be used as lead_report_id
  const reportBody = {
    reported_post_id: typia.random<string & tags.Format<"uuid">>(),
    reason_code: "harassment",
    reporter_anonymous: false,
    reporter_text: RandomGenerator.paragraph({ sentences: 6 }),
    status: "pending",
    priority: "normal",
  } satisfies IEconPoliticalForumReport.ICreate;

  const report: IEconPoliticalForumReport =
    await api.functional.econPoliticalForum.reports.create(adminConn, {
      body: reportBody,
    });
  typia.assert(report);
  TestValidator.predicate(
    "report created has id",
    typeof report.id === "string" && report.id.length > 0,
  );

  // 5) Admin creates a moderation case referencing the report
  const now = new Date();
  const caseNumber = `CASE-${now.getTime()}`;
  const caseCreateBody = {
    case_number: caseNumber,
    title: "E2E test moderation case",
    lead_report_id: report.id,
    status: "open",
    priority: "normal",
    summary: "Initial case created by automated E2E test",
    legal_hold: false,
  } satisfies IEconPoliticalForumModerationCase.ICreate;

  const moderationCase: IEconPoliticalForumModerationCase =
    await api.functional.econPoliticalForum.administrator.moderationCases.create(
      adminConn,
      { body: caseCreateBody },
    );
  typia.assert(moderationCase);
  TestValidator.equals(
    "created case number matches",
    moderationCase.case_number,
    caseNumber,
  );

  // Keep original updated_at for concurrency test
  const originalUpdatedAt = moderationCase.updated_at;

  // 6) Moderator triage: assign self, change status and priority, add summary
  const updateBody = {
    assigned_moderator_id: moderator.id,
    status: "investigating",
    priority: "high",
    summary:
      "Triage by moderator for automated test - assigning and escalating priority",
    escalation_reason: null,
    legal_hold: null,
  } satisfies IEconPoliticalForumModerationCase.IUpdate;

  const updatedCase: IEconPoliticalForumModerationCase =
    await api.functional.econPoliticalForum.moderator.moderationCases.update(
      modConn,
      {
        caseId: moderationCase.id,
        body: updateBody,
      },
    );
  typia.assert(updatedCase);

  // 7) Assertions on API response
  TestValidator.equals(
    "assigned moderator updated in response",
    updatedCase.assigned_moderator_id,
    moderator.id,
  );
  TestValidator.equals(
    "status updated to investigating",
    updatedCase.status,
    "investigating",
  );
  TestValidator.equals(
    "priority updated to high",
    updatedCase.priority,
    "high",
  );
  TestValidator.predicate(
    "updated_at is newer than original",
    new Date(updatedCase.updated_at) > new Date(originalUpdatedAt),
  );
  TestValidator.equals("case id unchanged", updatedCase.id, moderationCase.id);

  // 8) Concurrency test: attempt two near-simultaneous updates expecting conflict
  await TestValidator.error(
    "concurrent updates should cause at least one conflict",
    async () => {
      await Promise.all([
        api.functional.econPoliticalForum.moderator.moderationCases.update(
          modConn,
          {
            caseId: moderationCase.id,
            body: {
              status: "on_hold",
            } satisfies IEconPoliticalForumModerationCase.IUpdate,
          },
        ),
        api.functional.econPoliticalForum.moderator.moderationCases.update(
          modConn,
          {
            caseId: moderationCase.id,
            body: {
              status: "closed",
            } satisfies IEconPoliticalForumModerationCase.IUpdate,
          },
        ),
      ]);
    },
  );

  // 9) Negative test A: unauthorized caller (no auth) cannot update
  await TestValidator.error(
    "unauthorized user cannot update moderation case",
    async () => {
      await api.functional.econPoliticalForum.moderator.moderationCases.update(
        unauthConn,
        {
          caseId: moderationCase.id,
          body: {
            summary: "malicious attempt",
          } satisfies IEconPoliticalForumModerationCase.IUpdate,
        },
      );
    },
  );

  // 10) Negative test B: non-existent caseId
  await TestValidator.error(
    "updating non-existent case should fail",
    async () => {
      await api.functional.econPoliticalForum.moderator.moderationCases.update(
        modConn,
        {
          caseId: typia.random<string & tags.Format<"uuid">>(),
          body: {
            status: "investigating",
          } satisfies IEconPoliticalForumModerationCase.IUpdate,
        },
      );
    },
  );

  // 11) Teardown / cleanup: close the case to mark test completion
  const closeBody = {
    status: "closed",
    closed_at: new Date().toISOString(),
  } satisfies IEconPoliticalForumModerationCase.IUpdate;
  const closedCase =
    await api.functional.econPoliticalForum.moderator.moderationCases.update(
      modConn,
      {
        caseId: moderationCase.id,
        body: closeBody,
      },
    );
  typia.assert(closedCase);
  TestValidator.equals("case closed", closedCase.status, "closed");
}
