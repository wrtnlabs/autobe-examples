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
 * Test detailed report retrieval workflow for moderator review.
 *
 * Validates that moderators can retrieve comprehensive report information
 * including violation categorization, reporter details, reported content
 * references, and resolution status. This test ensures the moderation system
 * provides complete context for making informed moderation decisions.
 *
 * Test flow:
 *
 * 1. Create administrator account for platform management
 * 2. Create moderator account for report review
 * 3. Create member account for content creation and reporting
 * 4. Create discussion category for topic organization
 * 5. Member creates discussion topic with content
 * 6. Member creates reply to the topic
 * 7. Member reports the topic for hate_speech violation
 * 8. Moderator retrieves detailed report information
 * 9. Validate all report fields are correctly populated
 * 10. Test error scenarios (non-existent report, unauthorized access)
 */
export async function test_api_report_detail_retrieval_for_moderation_review(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account
  const adminAuthorized = await api.functional.auth.administrator.join(
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
  typia.assert(adminAuthorized);

  // Step 2: Create moderator account (appointed by administrator)
  const moderatorAuthorized = await api.functional.auth.moderator.join(
    connection,
    {
      body: {
        appointed_by_admin_id: adminAuthorized.id,
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
    },
  );
  typia.assert(moderatorAuthorized);

  // Step 3: Create member account for content creation
  const memberAuthorized = await api.functional.auth.member.join(connection, {
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
  typia.assert(memberAuthorized);

  // Step 4: Administrator creates discussion category
  const category =
    await api.functional.discussionBoard.administrator.categories.create(
      connection,
      {
        body: {
          name: RandomGenerator.paragraph({
            sentences: 2,
            wordMin: 3,
            wordMax: 8,
          }),
          slug: typia.random<string & tags.Pattern<"^[a-z0-9-]+$">>(),
          description: RandomGenerator.paragraph({
            sentences: 5,
            wordMin: 4,
            wordMax: 10,
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

  // Step 5: Member creates discussion topic with potentially offensive content
  const topic = await api.functional.discussionBoard.member.topics.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({
          sentences: 3,
          wordMin: 4,
          wordMax: 8,
        }),
        body: RandomGenerator.content({
          paragraphs: 3,
          sentenceMin: 15,
          sentenceMax: 25,
          wordMin: 4,
          wordMax: 8,
        }),
        category_id: category.id,
        tag_ids: null,
      } satisfies IDiscussionBoardTopic.ICreate,
    },
  );
  typia.assert(topic);

  // Step 6: Member creates reply with guideline violations
  const reply =
    await api.functional.discussionBoard.member.topics.replies.create(
      connection,
      {
        topicId: topic.id,
        body: {
          discussion_board_topic_id: topic.id,
          parent_reply_id: null,
          content: RandomGenerator.content({
            paragraphs: 2,
            sentenceMin: 10,
            sentenceMax: 15,
            wordMin: 3,
            wordMax: 7,
          }),
        } satisfies IDiscussionBoardReply.ICreate,
      },
    );
  typia.assert(reply);

  // Step 7: Member reports the topic for hate_speech violation
  const report = await api.functional.discussionBoard.member.reports.create(
    connection,
    {
      body: {
        reported_topic_id: topic.id,
        reported_reply_id: null,
        violation_category: "hate_speech",
        reporter_explanation: RandomGenerator.paragraph({
          sentences: 8,
          wordMin: 4,
          wordMax: 10,
        }),
      } satisfies IDiscussionBoardReport.ICreate,
    },
  );
  typia.assert(report);

  // Step 8: Moderator retrieves detailed report information
  const retrievedReport =
    await api.functional.discussionBoard.moderator.reports.at(connection, {
      reportId: report.id,
    });
  typia.assert(retrievedReport);

  // Step 9: Validate report details are correctly populated
  TestValidator.equals("report ID matches", retrievedReport.id, report.id);
  TestValidator.equals(
    "reporter member ID matches",
    retrievedReport.reporter_member_id,
    memberAuthorized.id,
  );
  TestValidator.equals(
    "reported topic ID matches",
    retrievedReport.reported_topic_id,
    topic.id,
  );
  TestValidator.equals(
    "reported reply ID is null",
    retrievedReport.reported_reply_id,
    null,
  );
  TestValidator.equals(
    "violation category is hate_speech",
    retrievedReport.violation_category,
    "hate_speech",
  );
  TestValidator.equals(
    "severity level is critical",
    retrievedReport.severity_level,
    "critical",
  );
  TestValidator.equals("status is pending", retrievedReport.status, "pending");
  TestValidator.equals(
    "assigned moderator is null initially",
    retrievedReport.assigned_moderator_id,
    null,
  );
  TestValidator.equals(
    "resolution notes is null for pending",
    retrievedReport.resolution_notes,
    null,
  );

  // Validate timestamps are present
  typia.assert(retrievedReport.created_at);
  typia.assert(retrievedReport.updated_at);

  // Step 10: Test error scenarios - non-existent reportId
  await TestValidator.error("non-existent reportId should fail", async () => {
    await api.functional.discussionBoard.moderator.reports.at(connection, {
      reportId: typia.random<string & tags.Format<"uuid">>(),
    });
  });

  // Test error scenarios - non-moderator user trying to access reports
  const unauthConn: api.IConnection = { ...connection, headers: {} };

  await TestValidator.error(
    "non-moderator cannot access report details",
    async () => {
      await api.functional.discussionBoard.moderator.reports.at(unauthConn, {
        reportId: report.id,
      });
    },
  );
}
