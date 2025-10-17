import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import type { IDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCategory";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IDiscussionBoardReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardReport";
import type { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";
import type { IDiscussionBoardTopic } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTopic";

/**
 * Test the complete moderation workflow where a moderator claims a pending
 * content report by assigning themselves, progresses it through under_review
 * status, and finally resolves it with resolution notes.
 *
 * Workflow:
 *
 * 1. Create administrator account for category creation
 * 2. Create discussion category (required for topics)
 * 3. Create moderator account for report handling
 * 4. Create member account for content creation
 * 5. Member creates a discussion topic
 * 6. Member reports the topic for violations
 * 7. Moderator assigns themselves to the report
 * 8. Moderator progresses report to under_review
 * 9. Moderator resolves report with notes
 * 10. Verify final resolved state
 */
export async function test_api_report_moderator_assignment_and_status_progression(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account for category creation
  const admin = await api.functional.auth.administrator.join(connection, {
    body: {
      username: RandomGenerator.alphaNumeric(10),
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<
        string & tags.MinLength<8> & tags.MaxLength<128>
      >(),
    } satisfies IDiscussionBoardAdministrator.ICreate,
  });
  typia.assert(admin);

  // Step 2: Create discussion board category
  const category =
    await api.functional.discussionBoard.administrator.categories.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(2),
          slug: RandomGenerator.alphaNumeric(8),
          description: RandomGenerator.paragraph({ sentences: 5 }),
          parent_category_id: null,
          display_order: 1,
          is_active: true,
        } satisfies IDiscussionBoardCategory.ICreate,
      },
    );
  typia.assert(category);

  // Step 3: Create moderator account
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      appointed_by_admin_id: admin.id,
      username: RandomGenerator.alphaNumeric(10),
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<
        string & tags.MinLength<8> & tags.MaxLength<128>
      >(),
    } satisfies IDiscussionBoardModerator.ICreate,
  });
  typia.assert(moderator);

  // Step 4: Create member account for content creation
  const member = await api.functional.auth.member.join(connection, {
    body: {
      username: RandomGenerator.alphaNumeric(10),
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<
        string & tags.MinLength<8> & tags.MaxLength<128>
      >(),
      display_name: RandomGenerator.name(),
    } satisfies IDiscussionBoardMember.ICreate,
  });
  typia.assert(member);

  // Step 5: Member creates a discussion topic
  const topic = await api.functional.discussionBoard.member.topics.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({
          sentences: 3,
          wordMin: 5,
          wordMax: 10,
        }),
        body: RandomGenerator.content({
          paragraphs: 3,
          sentenceMin: 10,
          sentenceMax: 20,
        }),
        category_id: category.id,
        tag_ids: null,
      } satisfies IDiscussionBoardTopic.ICreate,
    },
  );
  typia.assert(topic);

  // Step 6: Member reports the topic for guideline violations
  const violationCategories = [
    "personal_attack",
    "hate_speech",
    "misinformation",
    "spam",
    "offensive_language",
    "off_topic",
    "threats",
    "doxxing",
    "trolling",
    "other",
  ] as const;
  const selectedViolation = RandomGenerator.pick(violationCategories);

  const report = await api.functional.discussionBoard.member.reports.create(
    connection,
    {
      body: {
        reported_topic_id: topic.id,
        reported_reply_id: null,
        violation_category: selectedViolation,
        reporter_explanation:
          selectedViolation === "other"
            ? RandomGenerator.paragraph({
                sentences: 5,
                wordMin: 5,
                wordMax: 10,
              })
            : RandomGenerator.paragraph({
                sentences: 3,
                wordMin: 5,
                wordMax: 10,
              }),
      } satisfies IDiscussionBoardReport.ICreate,
    },
  );
  typia.assert(report);

  // Verify initial report status is pending
  TestValidator.equals(
    "initial report status is pending",
    report.status,
    "pending",
  );

  // Step 7: Moderator assigns themselves to the report
  const assignedReport =
    await api.functional.discussionBoard.moderator.reports.update(connection, {
      reportId: report.id,
      body: {
        assigned_moderator_id: moderator.id,
      } satisfies IDiscussionBoardReport.IUpdate,
    });
  typia.assert(assignedReport);

  // Verify moderator assignment
  TestValidator.equals(
    "moderator is assigned to report",
    assignedReport.assigned_moderator_id,
    moderator.id,
  );

  // Step 8: Progress report to under_review status
  const underReviewReport =
    await api.functional.discussionBoard.moderator.reports.update(connection, {
      reportId: report.id,
      body: {
        status: "under_review",
      } satisfies IDiscussionBoardReport.IUpdate,
    });
  typia.assert(underReviewReport);

  // Verify status transition to under_review
  TestValidator.equals(
    "report status is under_review",
    underReviewReport.status,
    "under_review",
  );

  // Step 9: Resolve the report with resolution notes
  const resolutionNotes = RandomGenerator.content({
    paragraphs: 2,
    sentenceMin: 8,
    sentenceMax: 15,
    wordMin: 5,
    wordMax: 10,
  });

  const resolvedReport =
    await api.functional.discussionBoard.moderator.reports.update(connection, {
      reportId: report.id,
      body: {
        status: "resolved",
        resolution_notes: resolutionNotes,
      } satisfies IDiscussionBoardReport.IUpdate,
    });
  typia.assert(resolvedReport);

  // Step 10: Verify final resolved state
  TestValidator.equals(
    "final report status is resolved",
    resolvedReport.status,
    "resolved",
  );
  TestValidator.equals(
    "resolution notes are recorded",
    resolvedReport.resolution_notes,
    resolutionNotes,
  );
  TestValidator.equals(
    "moderator assignment is maintained",
    resolvedReport.assigned_moderator_id,
    moderator.id,
  );
  TestValidator.predicate(
    "resolved_at timestamp is set",
    resolvedReport.resolved_at !== null &&
      resolvedReport.resolved_at !== undefined,
  );
}
