import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IDiscussionBoardReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardReport";

/**
 * Test that newly created reports are initialized with status='pending_review'.
 *
 * Validates the core moderation workflow requirement that reports enter the
 * review queue immediately upon creation without requiring moderator assignment
 * or intermediate states. This ensures proper report triage and moderator
 * workflow.
 *
 * Test sequence:
 *
 * 1. Register a member account to establish authentication
 * 2. Create a report with a valid reason category and optional description
 * 3. Verify created report has status='pending_review' (initial state)
 * 4. Confirm no moderator is assigned initially (assigned_moderator is null)
 * 5. Validate report metadata (id, reason, description, timestamps)
 * 6. Ensure created_at and updated_at are set to current time
 */
export async function test_api_report_creation_status_initial_pending_review(
  connection: api.IConnection,
) {
  // Step 1: Register a member account to establish authentication context
  const memberEmail: string = typia.random<string & tags.Format<"email">>();
  const memberData = {
    email: memberEmail,
    username: RandomGenerator.alphabets(10),
    display_name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(12),
  } satisfies IDiscussionBoardMember.ICreate;

  const authorizedMember: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: memberData,
    });
  typia.assert(authorizedMember);

  // Step 2: Create a report with valid reason and optional description
  const reasonOptions = [
    "offensive_language",
    "personal_attack",
    "spam",
    "off_topic",
    "copyright_violation",
    "harassment",
    "other",
  ] as const;
  const selectedReason = RandomGenerator.pick(reasonOptions);
  const reportDescription = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 3,
    wordMax: 8,
  });

  const createdReport: IDiscussionBoardReport =
    await api.functional.discussionBoard.member.reports.create(connection, {
      body: {
        reason: selectedReason,
        description: reportDescription,
      } satisfies IDiscussionBoardReport.ICreate,
    });
  typia.assert(createdReport);

  // Step 3: Verify report status is 'pending_review' (initial state requirement)
  TestValidator.equals(
    "report status should be pending_review on creation",
    createdReport.status,
    "pending_review",
  );

  // Step 4: Confirm no moderator is assigned initially
  TestValidator.predicate(
    "assigned_moderator should be null or undefined on creation",
    () =>
      createdReport.assigned_moderator === null ||
      createdReport.assigned_moderator === undefined,
  );

  // Step 5: Validate report contains all expected metadata
  TestValidator.predicate("report should have valid UUID id", () =>
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      createdReport.id,
    ),
  );

  TestValidator.equals(
    "report reason matches submitted reason",
    createdReport.reason,
    selectedReason,
  );

  TestValidator.equals(
    "report description matches submitted description",
    createdReport.description,
    reportDescription,
  );

  // Step 6: Ensure timestamps are properly set
  TestValidator.predicate(
    "created_at should be a valid ISO 8601 datetime",
    () => /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(createdReport.created_at),
  );

  TestValidator.predicate(
    "updated_at should be a valid ISO 8601 datetime",
    () => /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(createdReport.updated_at),
  );

  // Verify resolved_at is null since report hasn't been processed yet
  TestValidator.predicate(
    "resolved_at should be null for pending review report",
    () =>
      createdReport.resolved_at === null ||
      createdReport.resolved_at === undefined,
  );
}
