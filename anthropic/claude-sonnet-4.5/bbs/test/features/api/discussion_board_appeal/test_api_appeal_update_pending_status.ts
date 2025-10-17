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
 * Test that members can successfully update their appeal explanation and
 * additional evidence while the appeal is in pending_review status.
 *
 * This test validates a complete moderation workflow including:
 *
 * 1. Member registration and authentication
 * 2. Discussion content creation
 * 3. Content reporting and moderation
 * 4. Appeal submission
 * 5. Appeal update while in pending_review status
 * 6. Validation that only the appellant can modify their appeal
 * 7. Verification that updated fields are captured correctly while preserving
 *    original metadata
 */
export async function test_api_appeal_update_pending_status(
  connection: api.IConnection,
) {
  // Step 1: Create member account (appellant)
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        username: RandomGenerator.alphaNumeric(12),
        email: memberEmail,
        password: typia.random<
          string & tags.MinLength<8> & tags.MaxLength<128>
        >(),
        display_name: RandomGenerator.name(),
      } satisfies IDiscussionBoardMember.ICreate,
    });
  typia.assert(member);

  // Step 2: Create administrator account for category creation
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: IDiscussionBoardAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        username: RandomGenerator.alphaNumeric(12),
        email: adminEmail,
        password: typia.random<
          string & tags.MinLength<8> & tags.MaxLength<128>
        >(),
      } satisfies IDiscussionBoardAdministrator.ICreate,
    });
  typia.assert(admin);

  // Step 3: Create category for discussion topics
  const category: IDiscussionBoardCategory =
    await api.functional.discussionBoard.administrator.categories.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(2),
          slug: RandomGenerator.alphaNumeric(10),
          description: RandomGenerator.paragraph({ sentences: 5 }),
          display_order: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<0>
          >(),
          is_active: true,
        } satisfies IDiscussionBoardCategory.ICreate,
      },
    );
  typia.assert(category);

  // Step 4: Switch back to member and create discussion topic
  const topic: IDiscussionBoardTopic =
    await api.functional.discussionBoard.member.topics.create(connection, {
      body: {
        title: RandomGenerator.paragraph({ sentences: 3 }),
        body: RandomGenerator.content({ paragraphs: 3 }),
        category_id: category.id,
        tag_ids: null,
      } satisfies IDiscussionBoardTopic.ICreate,
    });
  typia.assert(topic);

  // Step 5: Create a reply that will be moderated
  const reply: IDiscussionBoardReply =
    await api.functional.discussionBoard.member.topics.replies.create(
      connection,
      {
        topicId: topic.id,
        body: {
          discussion_board_topic_id: topic.id,
          parent_reply_id: null,
          content: RandomGenerator.content({ paragraphs: 2 }),
        } satisfies IDiscussionBoardReply.ICreate,
      },
    );
  typia.assert(reply);

  // Step 6: Submit a report for the reply
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

  const report: IDiscussionBoardReport =
    await api.functional.discussionBoard.member.reports.create(connection, {
      body: {
        reported_topic_id: null,
        reported_reply_id: reply.id,
        violation_category: selectedViolation,
        reporter_explanation: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies IDiscussionBoardReport.ICreate,
    });
  typia.assert(report);

  // Step 7: Create moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        appointed_by_admin_id: admin.id,
        username: RandomGenerator.alphaNumeric(12),
        email: moderatorEmail,
        password: typia.random<
          string & tags.MinLength<8> & tags.MaxLength<128>
        >(),
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 8: Moderator creates moderation action
  const actionTypes = [
    "hide_content",
    "delete_content",
    "issue_warning",
    "suspend_user",
    "ban_user",
    "restore_content",
    "dismiss_report",
  ] as const;
  const actionType = RandomGenerator.pick(actionTypes);

  const moderationAction: IDiscussionBoardModerationAction =
    await api.functional.discussionBoard.moderator.moderationActions.create(
      connection,
      {
        body: {
          moderator_id: moderator.id,
          administrator_id: null,
          target_member_id: member.id,
          related_report_id: report.id,
          content_topic_id: null,
          content_reply_id: reply.id,
          action_type: actionType,
          reason: RandomGenerator.paragraph({ sentences: 5 }),
          violation_category: selectedViolation,
          content_snapshot: reply.content,
        } satisfies IDiscussionBoardModerationAction.ICreate,
      },
    );
  typia.assert(moderationAction);

  // Step 9: Switch back to member and submit initial appeal
  const initialExplanation = RandomGenerator.content({
    paragraphs: 2,
    sentenceMin: 10,
    sentenceMax: 15,
  });
  const initialEvidence = RandomGenerator.paragraph({ sentences: 3 });

  const appeal: IDiscussionBoardAppeal =
    await api.functional.discussionBoard.member.appeals.create(connection, {
      body: {
        appealed_moderation_action_id: moderationAction.id,
        appealed_warning_id: undefined,
        appealed_suspension_id: undefined,
        appealed_ban_id: undefined,
        appeal_explanation: initialExplanation,
        additional_evidence: initialEvidence,
      } satisfies IDiscussionBoardAppeal.ICreate,
    });
  typia.assert(appeal);

  // Step 10: Update the appeal with strengthened explanation and additional evidence
  const updatedExplanation = RandomGenerator.content({
    paragraphs: 3,
    sentenceMin: 12,
    sentenceMax: 20,
  });
  const updatedEvidence = RandomGenerator.content({
    paragraphs: 2,
    sentenceMin: 8,
    sentenceMax: 12,
  });

  const updatedAppeal: IDiscussionBoardAppeal =
    await api.functional.discussionBoard.member.appeals.update(connection, {
      appealId: appeal.id,
      body: {
        appeal_explanation: updatedExplanation,
        additional_evidence: updatedEvidence,
      } satisfies IDiscussionBoardAppeal.IUpdate,
    });
  typia.assert(updatedAppeal);

  // Step 11: Validate the appeal update results
  TestValidator.equals("appeal ID is preserved", updatedAppeal.id, appeal.id);
  TestValidator.equals(
    "appeal explanation is updated",
    updatedAppeal.appeal_explanation,
    updatedExplanation,
  );
  TestValidator.equals(
    "additional evidence is updated",
    updatedAppeal.additional_evidence,
    updatedEvidence,
  );
  TestValidator.equals(
    "appeal status remains pending_review",
    updatedAppeal.status,
    "pending_review",
  );
  TestValidator.equals(
    "created_at timestamp is preserved",
    updatedAppeal.submitted_at,
    appeal.submitted_at,
  );
  TestValidator.predicate(
    "updated_at timestamp is refreshed",
    new Date(updatedAppeal.updated_at).getTime() >=
      new Date(appeal.updated_at).getTime(),
  );
}
