import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import type { IDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCategory";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IDiscussionBoardReply } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardReply";
import type { IDiscussionBoardReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardReport";
import type { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";
import type { IDiscussionBoardTopic } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTopic";

/**
 * Test the complete moderation workflow for reports on discussion replies.
 *
 * This test validates that the report update system works correctly for reply
 * content types, ensuring moderators can process reply reports through the
 * complete workflow from submission to resolution.
 *
 * Workflow steps:
 *
 * 1. Create moderator account for handling reply reports
 * 2. Create administrator account for category creation
 * 3. Create discussion category
 * 4. Create first member account for topic creation
 * 5. Create discussion topic
 * 6. Create second member account for reply posting and reporting
 * 7. Post a reply to the topic
 * 8. Second member reports the reply for guideline violations
 * 9. Moderator assigns themselves to the reply report
 * 10. Moderator progresses report to under_review status
 * 11. Moderator resolves the report with detailed resolution notes
 * 12. Verify the reply report is properly resolved
 */
export async function test_api_report_reply_violation_workflow(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account
  const adminForModeratorAppointment =
    await api.functional.auth.administrator.join(connection, {
      body: {
        username: typia.random<
          string &
            tags.MinLength<3> &
            tags.MaxLength<30> &
            tags.Pattern<"^[a-zA-Z0-9_-]+$">
        >(),
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<
          string & tags.MinLength<8> & tags.MaxLength<128>
        >(),
      } satisfies IDiscussionBoardAdministrator.ICreate,
    });
  typia.assert(adminForModeratorAppointment);

  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      appointed_by_admin_id: adminForModeratorAppointment.id,
      username: typia.random<
        string &
          tags.MinLength<3> &
          tags.MaxLength<30> &
          tags.Pattern<"^[a-zA-Z0-9_-]+$">
      >(),
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<
        string & tags.MinLength<8> & tags.MaxLength<128>
      >(),
    } satisfies IDiscussionBoardModerator.ICreate,
  });
  typia.assert(moderator);

  // Step 2: Create administrator account for category creation
  const administrator = await api.functional.auth.administrator.join(
    connection,
    {
      body: {
        username: typia.random<
          string &
            tags.MinLength<3> &
            tags.MaxLength<30> &
            tags.Pattern<"^[a-zA-Z0-9_-]+$">
        >(),
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<
          string & tags.MinLength<8> & tags.MaxLength<128>
        >(),
      } satisfies IDiscussionBoardAdministrator.ICreate,
    },
  );
  typia.assert(administrator);

  // Step 3: Create discussion category
  const category =
    await api.functional.discussionBoard.administrator.categories.create(
      connection,
      {
        body: {
          name: typia.random<string & tags.MinLength<3> & tags.MaxLength<50>>(),
          slug: typia.random<string & tags.Pattern<"^[a-z0-9-]+$">>(),
          description: RandomGenerator.paragraph({
            sentences: 5,
            wordMin: 4,
            wordMax: 8,
          }),
          parent_category_id: null,
          display_order: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<0>
          >(),
          is_active: true,
        } satisfies IDiscussionBoardCategory.ICreate,
      },
    );
  typia.assert(category);

  // Step 4: Create first member account for topic creation
  const firstMember = await api.functional.auth.member.join(connection, {
    body: {
      username: typia.random<
        string &
          tags.MinLength<3> &
          tags.MaxLength<30> &
          tags.Pattern<"^[a-zA-Z0-9_-]+$">
      >(),
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<
        string & tags.MinLength<8> & tags.MaxLength<128>
      >(),
      display_name: RandomGenerator.name(2),
    } satisfies IDiscussionBoardMember.ICreate,
  });
  typia.assert(firstMember);

  // Step 5: Create discussion topic
  const topic = await api.functional.discussionBoard.member.topics.create(
    connection,
    {
      body: {
        title: typia.random<
          string & tags.MinLength<10> & tags.MaxLength<200>
        >(),
        body: typia.random<
          string & tags.MinLength<20> & tags.MaxLength<50000>
        >(),
        category_id: category.id,
        tag_ids: null,
      } satisfies IDiscussionBoardTopic.ICreate,
    },
  );
  typia.assert(topic);

  // Step 6: Create second member account for reply posting and reporting
  const secondMember = await api.functional.auth.member.join(connection, {
    body: {
      username: typia.random<
        string &
          tags.MinLength<3> &
          tags.MaxLength<30> &
          tags.Pattern<"^[a-zA-Z0-9_-]+$">
      >(),
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<
        string & tags.MinLength<8> & tags.MaxLength<128>
      >(),
      display_name: RandomGenerator.name(2),
    } satisfies IDiscussionBoardMember.ICreate,
  });
  typia.assert(secondMember);

  // Step 7: Post a reply to the topic
  const reply =
    await api.functional.discussionBoard.member.topics.replies.create(
      connection,
      {
        topicId: topic.id,
        body: {
          discussion_board_topic_id: topic.id,
          parent_reply_id: null,
          content: typia.random<
            string & tags.MinLength<1> & tags.MaxLength<10000>
          >(),
        } satisfies IDiscussionBoardReply.ICreate,
      },
    );
  typia.assert(reply);

  // Step 8: Second member reports the reply for guideline violations
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
        reported_topic_id: null,
        reported_reply_id: reply.id,
        violation_category: selectedViolation,
        reporter_explanation:
          selectedViolation === "other"
            ? RandomGenerator.paragraph({
                sentences: 5,
                wordMin: 4,
                wordMax: 8,
              })
            : RandomGenerator.paragraph({
                sentences: 3,
                wordMin: 4,
                wordMax: 8,
              }),
      } satisfies IDiscussionBoardReport.ICreate,
    },
  );
  typia.assert(report);

  // Verify initial report state
  TestValidator.equals(
    "report targets reply, not topic",
    report.reported_topic_id,
    null,
  );
  TestValidator.predicate(
    "report has reply reference",
    report.reported_reply_id === reply.id,
  );
  TestValidator.equals("report status is pending", report.status, "pending");

  // Step 9: Moderator assigns themselves to the reply report
  const assignedReport =
    await api.functional.discussionBoard.moderator.reports.update(connection, {
      reportId: report.id,
      body: {
        assigned_moderator_id: moderator.id,
        status: "under_review",
      } satisfies IDiscussionBoardReport.IUpdate,
    });
  typia.assert(assignedReport);

  // Verify moderator assignment
  TestValidator.equals(
    "moderator is assigned",
    assignedReport.assigned_moderator_id,
    moderator.id,
  );
  TestValidator.equals(
    "status is under_review",
    assignedReport.status,
    "under_review",
  );

  // Step 10: Moderator resolves the report with detailed resolution notes
  const resolutionNotes = RandomGenerator.content({
    paragraphs: 2,
    sentenceMin: 10,
    sentenceMax: 15,
    wordMin: 4,
    wordMax: 8,
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

  // Step 11: Verify the reply report is properly resolved
  TestValidator.equals(
    "report status is resolved",
    resolvedReport.status,
    "resolved",
  );
  TestValidator.predicate(
    "resolution notes are recorded",
    resolvedReport.resolution_notes === resolutionNotes,
  );
  TestValidator.predicate(
    "resolved timestamp exists",
    resolvedReport.resolved_at !== null &&
      resolvedReport.resolved_at !== undefined,
  );
  TestValidator.equals(
    "report still targets reply",
    resolvedReport.reported_reply_id,
    reply.id,
  );
  TestValidator.equals(
    "report does not target topic",
    resolvedReport.reported_topic_id,
    null,
  );
}
