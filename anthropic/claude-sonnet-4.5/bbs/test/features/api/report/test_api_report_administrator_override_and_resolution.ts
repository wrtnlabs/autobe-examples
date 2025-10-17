import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import type { IDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCategory";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardReport";
import type { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";
import type { IDiscussionBoardTopic } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTopic";

/**
 * Test administrator's ability to update and resolve content reports with full
 * administrative privileges.
 *
 * This test validates that administrators have complete authority to handle
 * reports throughout the entire moderation workflow. Unlike moderators who may
 * have restricted access, administrators can directly assign themselves to any
 * report, progress reports through all status transitions, and provide
 * comprehensive resolutions.
 *
 * The test workflow covers:
 *
 * 1. Administrator account creation and authentication
 * 2. Category setup for discussion board content
 * 3. Member account creation for content generation
 * 4. Topic creation by member
 * 5. Report submission by member against the topic
 * 6. Administrator self-assignment to the report
 * 7. Status progression from pending to under_review
 * 8. Final resolution with detailed notes
 * 9. Validation of all report state changes
 */
export async function test_api_report_administrator_override_and_resolution(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account
  const adminCreateData = {
    username: RandomGenerator.alphaNumeric(10),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
  } satisfies IDiscussionBoardAdministrator.ICreate;

  const administrator: IDiscussionBoardAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: adminCreateData,
    });
  typia.assert(administrator);

  // Step 2: Create discussion category as administrator
  const categoryData = {
    name: RandomGenerator.name(2),
    slug: RandomGenerator.alphaNumeric(8),
    description: RandomGenerator.paragraph({ sentences: 2 }),
    parent_category_id: null,
    display_order: 1,
    is_active: true,
  } satisfies IDiscussionBoardCategory.ICreate;

  const category: IDiscussionBoardCategory =
    await api.functional.discussionBoard.administrator.categories.create(
      connection,
      {
        body: categoryData,
      },
    );
  typia.assert(category);

  // Step 3: Create member account
  const memberCreateData = {
    username: RandomGenerator.alphaNumeric(10),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    display_name: RandomGenerator.name(),
  } satisfies IDiscussionBoardMember.ICreate;

  const member: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: memberCreateData,
    });
  typia.assert(member);

  // Step 4: Member creates a discussion topic
  const topicData = {
    title: RandomGenerator.paragraph({ sentences: 1, wordMin: 5, wordMax: 10 }),
    body: RandomGenerator.content({ paragraphs: 2 }),
    category_id: category.id,
    tag_ids: null,
  } satisfies IDiscussionBoardTopic.ICreate;

  const topic: IDiscussionBoardTopic =
    await api.functional.discussionBoard.member.topics.create(connection, {
      body: topicData,
    });
  typia.assert(topic);

  // Step 5: Member reports the topic
  const violationCategories = [
    "personal_attack",
    "hate_speech",
    "misinformation",
    "spam",
    "offensive_language",
    "off_topic",
  ] as const;
  const selectedViolation = RandomGenerator.pick(violationCategories);

  const reportData = {
    reported_topic_id: topic.id,
    reported_reply_id: null,
    violation_category: selectedViolation,
    reporter_explanation: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies IDiscussionBoardReport.ICreate;

  const report: IDiscussionBoardReport =
    await api.functional.discussionBoard.member.reports.create(connection, {
      body: reportData,
    });
  typia.assert(report);

  // Verify initial report status is pending
  TestValidator.equals("initial report status", report.status, "pending");

  // Step 6: Administrator assigns themselves to the report
  const assignUpdate = {
    assigned_moderator_id: administrator.id,
    status: undefined,
    resolution_notes: undefined,
    dismissal_reason: undefined,
  } satisfies IDiscussionBoardReport.IUpdate;

  const assignedReport: IDiscussionBoardReport =
    await api.functional.discussionBoard.administrator.reports.update(
      connection,
      {
        reportId: report.id,
        body: assignUpdate,
      },
    );
  typia.assert(assignedReport);

  // Validate administrator assignment
  TestValidator.equals(
    "administrator assigned to report",
    assignedReport.assigned_moderator_id,
    administrator.id,
  );

  // Step 7: Administrator progresses report to under_review
  const reviewUpdate = {
    assigned_moderator_id: undefined,
    status: "under_review",
    resolution_notes: undefined,
    dismissal_reason: undefined,
  } satisfies IDiscussionBoardReport.IUpdate;

  const underReviewReport: IDiscussionBoardReport =
    await api.functional.discussionBoard.administrator.reports.update(
      connection,
      {
        reportId: report.id,
        body: reviewUpdate,
      },
    );
  typia.assert(underReviewReport);

  // Validate status transition to under_review
  TestValidator.equals(
    "report status updated to under_review",
    underReviewReport.status,
    "under_review",
  );

  // Step 8: Administrator resolves the report with comprehensive notes
  const resolutionNotes = RandomGenerator.content({
    paragraphs: 2,
    sentenceMin: 5,
    sentenceMax: 10,
  });

  const resolveUpdate = {
    assigned_moderator_id: undefined,
    status: "resolved",
    resolution_notes: resolutionNotes,
    dismissal_reason: undefined,
  } satisfies IDiscussionBoardReport.IUpdate;

  const resolvedReport: IDiscussionBoardReport =
    await api.functional.discussionBoard.administrator.reports.update(
      connection,
      {
        reportId: report.id,
        body: resolveUpdate,
      },
    );
  typia.assert(resolvedReport);

  // Step 9: Validate final resolved state
  TestValidator.equals(
    "report status is resolved",
    resolvedReport.status,
    "resolved",
  );
  TestValidator.equals(
    "resolution notes are present",
    resolvedReport.resolution_notes,
    resolutionNotes,
  );
  TestValidator.equals(
    "administrator remains assigned",
    resolvedReport.assigned_moderator_id,
    administrator.id,
  );
  TestValidator.predicate(
    "resolved_at timestamp is set",
    resolvedReport.resolved_at !== null &&
      resolvedReport.resolved_at !== undefined,
  );
}
