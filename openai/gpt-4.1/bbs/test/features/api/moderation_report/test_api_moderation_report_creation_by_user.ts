import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAuthorizationToken";
import type { IDiscussionBoardReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardReport";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";

/**
 * Validate that a newly registered user can create a moderation report, with
 * all business constraints enforced.
 *
 * Scenario:
 *
 * 1. Register a new user and verify authentication.
 * 2. Prepare a valid moderation report payload with required (target_type,
 *    target_id, reason) and optional (description) fields.
 * 3. Submit the report and assert:
 *
 *    - The report is associated with the authenticated user (cannot be spoofed by
 *         client).
 *    - System-assigned fields (reporter_user_id, id, status, created_at, updated_at,
 *         deleted_at) cannot be set by client and are set only by the system.
 *    - All metadata fields are correctly system-assigned and match expected business
 *         logic.
 *    - Status is correctly initialized per workflow (e.g. "open" or system setting).
 *    - Mandatory/optional property handling (description accepted as null or
 *         omitted).
 * 4. Attempt to submit a duplicate report (same user, target_type, target_id),
 *    assert it is rejected as a unique constraint violation.
 * 5. Attempt to submit a report with a client-supplied forbidden field (e.g.
 *    reporter_user_id or status), and ensure the field is ignored or error
 *    occurs.
 */
export async function test_api_moderation_report_creation_by_user(
  connection: api.IConnection,
) {
  // 1. Register a new user
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(12);
  const href = "https://board.example.com/register";
  const referrer =
    "https://board.example.com/article/" + RandomGenerator.alphaNumeric(8);
  const ip = typia.random<
    string & (tags.Format<"ipv4"> | tags.Format<"ipv6">)
  >();

  const join = await api.functional.auth.user.join(connection, {
    body: {
      email,
      password,
      href,
      referrer,
      ip,
    } satisfies IDiscussionBoardUser.ICreate,
  });
  typia.assert(join);

  // 2. Prepare a moderation report payload
  const validTargetTypes = ["article", "comment", "attachment"] as const;
  const target_type = RandomGenerator.pick(validTargetTypes);
  const target_id = typia.random<string & tags.Format<"uuid">>();
  const reason = RandomGenerator.paragraph({
    sentences: 1,
    wordMin: 8,
    wordMax: 20,
  });
  const description = RandomGenerator.content({
    paragraphs: 1,
    sentenceMin: 10,
  });

  const reportPayload = {
    target_type,
    target_id,
    reason,
    description,
  } satisfies IDiscussionBoardReport.ICreate;

  // 3. Submit report
  const report =
    await api.functional.discussionBoard.user.moderation.reports.create(
      connection,
      { body: reportPayload },
    );
  typia.assert(report);
  TestValidator.equals(
    "reporter is authenticated user",
    report.reporter_user_id,
    join.id,
  );
  TestValidator.notEquals(
    "system auto-generated id is not empty",
    report.id,
    "",
  );
  TestValidator.predicate(
    "created_at is valid ISO timestamp",
    typeof report.created_at === "string" && !!Date.parse(report.created_at),
  );
  TestValidator.equals("target_type matches", report.target_type, target_type);
  TestValidator.equals("target_id matches", report.target_id, target_id);
  TestValidator.equals("reason matches", report.reason, reason);
  TestValidator.equals("description matches", report.description, description);
  TestValidator.predicate(
    "status must be non-empty string",
    typeof report.status === "string" && report.status.length > 0,
  );
  TestValidator.predicate(
    "created_at != updated_at valid timestamps",
    report.created_at === report.updated_at || !!Date.parse(report.updated_at),
  );
  TestValidator.equals(
    "deleted_at is null or undefined",
    report.deleted_at,
    null,
  );

  // 4. Duplicate report for same user-target is rejected
  await TestValidator.error("duplicate report not allowed", async () => {
    await api.functional.discussionBoard.user.moderation.reports.create(
      connection,
      { body: reportPayload },
    );
  });

  // 5. Attempt system field injection, must be ignored or rejected
  const maliciousPayload = {
    ...reportPayload,
    reporter_user_id: typia.random<string & tags.Format<"uuid">>(),
    status: "malicious",
    id: typia.random<string & tags.Format<"uuid">>(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    deleted_at: new Date().toISOString(),
  } as any;
  await TestValidator.error(
    "system fields in request body are forbidden",
    async () => {
      await api.functional.discussionBoard.user.moderation.reports.create(
        connection,
        { body: maliciousPayload },
      );
    },
  );
}
