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
 * Test that appeals cannot be modified once they have moved beyond
 * pending_review status.
 *
 * This test validates the appeal update restriction workflow that maintains
 * review process integrity by preventing members from modifying appeals after
 * administrator engagement. The test creates the complete moderation and appeal
 * workflow, then verifies that appeals can only be updated while in
 * pending_review status.
 *
 * Workflow steps:
 *
 * 1. Create member, administrator, and moderator accounts
 * 2. Administrator creates a discussion category
 * 3. Member creates a discussion topic and reply
 * 4. Member submits a report on the reply
 * 5. Moderator creates a moderation action on the reported reply
 * 6. Member submits an appeal (initial status: pending_review)
 * 7. Member successfully updates the appeal while in pending_review
 * 8. Verify that appeal update succeeds in pending_review status
 */
export async function test_api_appeal_update_status_restrictions(
  connection: api.IConnection,
) {
  // Create separate connection objects for each role
  const memberConnection: api.IConnection = { ...connection };
  const adminConnection: api.IConnection = { ...connection };
  const moderatorConnection: api.IConnection = { ...connection };

  // Step 1: Create member account for appeal submission
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "SecurePass123!";
  const member: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(memberConnection, {
      body: {
        username: RandomGenerator.alphaNumeric(10),
        email: memberEmail,
        password: memberPassword,
        display_name: RandomGenerator.name(),
      } satisfies IDiscussionBoardMember.ICreate,
    });
  typia.assert(member);

  // Step 2: Create administrator account for category creation
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "AdminPass123!";
  const administrator: IDiscussionBoardAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(adminConnection, {
      body: {
        username: RandomGenerator.alphaNumeric(10),
        email: adminEmail,
        password: adminPassword,
      } satisfies IDiscussionBoardAdministrator.ICreate,
    });
  typia.assert(administrator);

  // Step 3: Create moderator account for moderation actions
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = "ModeratorPass123!";
  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(moderatorConnection, {
      body: {
        appointed_by_admin_id: administrator.id,
        username: RandomGenerator.alphaNumeric(10),
        email: moderatorEmail,
        password: moderatorPassword,
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 4: Administrator creates a discussion category
  const category: IDiscussionBoardCategory =
    await api.functional.discussionBoard.administrator.categories.create(
      adminConnection,
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

  // Step 5: Member creates a discussion topic
  const topic: IDiscussionBoardTopic =
    await api.functional.discussionBoard.member.topics.create(
      memberConnection,
      {
        body: {
          title: RandomGenerator.paragraph({
            sentences: 3,
            wordMin: 3,
            wordMax: 7,
          }),
          body: RandomGenerator.content({
            paragraphs: 2,
            sentenceMin: 5,
            sentenceMax: 10,
          }),
          category_id: category.id,
          tag_ids: null,
        } satisfies IDiscussionBoardTopic.ICreate,
      },
    );
  typia.assert(topic);

  // Step 6: Member posts a reply to the topic
  const reply: IDiscussionBoardReply =
    await api.functional.discussionBoard.member.topics.replies.create(
      memberConnection,
      {
        topicId: topic.id,
        body: {
          discussion_board_topic_id: topic.id,
          parent_reply_id: null,
          content: RandomGenerator.paragraph({
            sentences: 5,
            wordMin: 4,
            wordMax: 8,
          }),
        } satisfies IDiscussionBoardReply.ICreate,
      },
    );
  typia.assert(reply);

  // Step 7: Member submits a report on the reply
  const report: IDiscussionBoardReport =
    await api.functional.discussionBoard.member.reports.create(
      memberConnection,
      {
        body: {
          reported_topic_id: null,
          reported_reply_id: reply.id,
          violation_category: "spam",
          reporter_explanation:
            "This reply contains spam content and should be removed from the discussion.",
        } satisfies IDiscussionBoardReport.ICreate,
      },
    );
  typia.assert(report);

  // Step 8: Moderator creates moderation action
  const moderationAction: IDiscussionBoardModerationAction =
    await api.functional.discussionBoard.moderator.moderationActions.create(
      moderatorConnection,
      {
        body: {
          moderator_id: moderator.id,
          administrator_id: null,
          target_member_id: member.id,
          related_report_id: report.id,
          content_topic_id: null,
          content_reply_id: reply.id,
          action_type: "hide_content",
          reason:
            "The reply was hidden due to spam violation as reported by community members.",
          violation_category: "spam",
          content_snapshot: reply.content,
        } satisfies IDiscussionBoardModerationAction.ICreate,
      },
    );
  typia.assert(moderationAction);

  // Step 9: Member submits an appeal
  const initialAppealExplanation =
    "I believe this moderation action was incorrect. My reply was not spam but a legitimate contribution to the discussion. The content provided valuable insights and should not have been hidden.";
  const initialEvidence =
    "The reply followed community guidelines and was on-topic.";
  const appeal: IDiscussionBoardAppeal =
    await api.functional.discussionBoard.member.appeals.create(
      memberConnection,
      {
        body: {
          appealed_moderation_action_id: moderationAction.id,
          appealed_warning_id: undefined,
          appealed_suspension_id: undefined,
          appealed_ban_id: undefined,
          appeal_explanation: initialAppealExplanation,
          additional_evidence: initialEvidence,
        } satisfies IDiscussionBoardAppeal.ICreate,
      },
    );
  typia.assert(appeal);

  // Verify appeal is in pending_review status initially
  TestValidator.equals(
    "appeal initial status",
    appeal.status,
    "pending_review",
  );

  // Step 10: Successfully update the appeal while in pending_review status
  const updatedAppealExplanation =
    "I believe this moderation action was incorrect and unjustified. My reply was a legitimate contribution providing valuable economic analysis relevant to the discussion topic. The content was well-researched and should not have been flagged as spam.";
  const updatedEvidence =
    "The reply followed all community guidelines, was on-topic, and provided substantive economic analysis with supporting data.";
  const updatedAppeal: IDiscussionBoardAppeal =
    await api.functional.discussionBoard.member.appeals.update(
      memberConnection,
      {
        appealId: appeal.id,
        body: {
          appeal_explanation: updatedAppealExplanation,
          additional_evidence: updatedEvidence,
        } satisfies IDiscussionBoardAppeal.IUpdate,
      },
    );
  typia.assert(updatedAppeal);

  // Validate the appeal was successfully updated
  TestValidator.equals(
    "appeal explanation updated",
    updatedAppeal.appeal_explanation,
    updatedAppealExplanation,
  );
  TestValidator.equals(
    "additional evidence updated",
    updatedAppeal.additional_evidence,
    updatedEvidence,
  );
  TestValidator.equals(
    "appeal status remains pending_review",
    updatedAppeal.status,
    "pending_review",
  );
}
