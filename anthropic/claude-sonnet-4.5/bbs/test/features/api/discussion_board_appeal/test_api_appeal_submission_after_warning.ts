import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import type { IDiscussionBoardAppeal } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAppeal";
import type { IDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCategory";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerationAction";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IDiscussionBoardReply } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardReply";
import type { IDiscussionBoardReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardReport";
import type { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";
import type { IDiscussionBoardTopic } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTopic";

/**
 * Test the complete workflow of submitting an appeal after receiving a warning
 * for guideline violations.
 *
 * This test validates the end-to-end appeal submission process following a
 * moderation warning. It covers member registration, category creation, topic
 * and reply creation, content reporting, moderator warning issuance, and
 * finally the appeal submission by the warned member.
 *
 * Workflow:
 *
 * 1. Create member account for authentication
 * 2. Create administrator account for category management
 * 3. Create moderator account for moderation actions
 * 4. Administrator creates a discussion category
 * 5. Member creates a discussion topic
 * 6. Member posts a reply violating guidelines
 * 7. Member submits a content report on the violating reply
 * 8. Moderator creates a moderation action issuing a warning
 * 9. Member submits an appeal contesting the warning
 * 10. Validate appeal creation and status
 */
export async function test_api_appeal_submission_after_warning(
  connection: api.IConnection,
) {
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "SecurePass123!";
  const member = await api.functional.auth.member.join(connection, {
    body: {
      username: typia.random<
        string &
          tags.MinLength<3> &
          tags.MaxLength<30> &
          tags.Pattern<"^[a-zA-Z0-9_-]+$">
      >(),
      email: memberEmail,
      password: memberPassword,
      display_name: RandomGenerator.name(),
    } satisfies IDiscussionBoardMember.ICreate,
  });
  typia.assert(member);

  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin = await api.functional.auth.administrator.join(connection, {
    body: {
      username: typia.random<
        string &
          tags.MinLength<3> &
          tags.MaxLength<30> &
          tags.Pattern<"^[a-zA-Z0-9_-]+$">
      >(),
      email: adminEmail,
      password: "AdminPass456!",
    } satisfies IDiscussionBoardAdministrator.ICreate,
  });
  typia.assert(admin);

  const category =
    await api.functional.discussionBoard.administrator.categories.create(
      connection,
      {
        body: {
          name: "Politics",
          slug: "politics",
          description: "Political discussions and debates",
          display_order: 1,
          is_active: true,
        } satisfies IDiscussionBoardCategory.ICreate,
      },
    );
  typia.assert(category);

  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      appointed_by_admin_id: admin.id,
      username: typia.random<
        string &
          tags.MinLength<3> &
          tags.MaxLength<30> &
          tags.Pattern<"^[a-zA-Z0-9_-]+$">
      >(),
      email: moderatorEmail,
      password: "ModPass789!",
    } satisfies IDiscussionBoardModerator.ICreate,
  });
  typia.assert(moderator);

  const topic = await api.functional.discussionBoard.member.topics.create(
    connection,
    {
      body: {
        title: "Discussion on Economic Policy",
        body: RandomGenerator.content({
          paragraphs: 2,
          sentenceMin: 10,
          sentenceMax: 20,
        }),
        category_id: category.id,
        tag_ids: null,
      } satisfies IDiscussionBoardTopic.ICreate,
    },
  );
  typia.assert(topic);

  const violatingReply =
    await api.functional.discussionBoard.member.topics.replies.create(
      connection,
      {
        topicId: topic.id,
        body: {
          discussion_board_topic_id: topic.id,
          parent_reply_id: null,
          content:
            "This is offensive language that violates community guidelines",
        } satisfies IDiscussionBoardReply.ICreate,
      },
    );
  typia.assert(violatingReply);

  const report = await api.functional.discussionBoard.member.reports.create(
    connection,
    {
      body: {
        reported_topic_id: null,
        reported_reply_id: violatingReply.id,
        violation_category: "offensive_language",
        reporter_explanation: "This reply contains inappropriate language",
      } satisfies IDiscussionBoardReport.ICreate,
    },
  );
  typia.assert(report);

  const moderationAction =
    await api.functional.discussionBoard.moderator.moderationActions.create(
      connection,
      {
        body: {
          moderator_id: moderator.id,
          administrator_id: null,
          target_member_id: member.id,
          related_report_id: report.id,
          content_topic_id: null,
          content_reply_id: violatingReply.id,
          action_type: "issue_warning",
          reason:
            "Your reply contained offensive language that violates our community guidelines",
          violation_category: "offensive_language",
          content_snapshot: violatingReply.content,
        } satisfies IDiscussionBoardModerationAction.ICreate,
      },
    );
  typia.assert(moderationAction);

  const appeal = await api.functional.discussionBoard.member.appeals.create(
    connection,
    {
      body: {
        appealed_moderation_action_id: moderationAction.id,
        appealed_warning_id: undefined,
        appealed_suspension_id: undefined,
        appealed_ban_id: undefined,
        appeal_explanation: RandomGenerator.paragraph({
          sentences: 15,
          wordMin: 4,
          wordMax: 8,
        }),
        additional_evidence:
          "I believe my language was taken out of context and was not intended to offend",
      } satisfies IDiscussionBoardAppeal.ICreate,
    },
  );
  typia.assert(appeal);

  TestValidator.equals(
    "appeal status is pending_review",
    appeal.status,
    "pending_review",
  );
  TestValidator.predicate(
    "appeal explanation is captured",
    appeal.appeal_explanation.length >= 100,
  );
  TestValidator.predicate(
    "appeal has additional evidence",
    appeal.additional_evidence !== null &&
      appeal.additional_evidence !== undefined,
  );
}
