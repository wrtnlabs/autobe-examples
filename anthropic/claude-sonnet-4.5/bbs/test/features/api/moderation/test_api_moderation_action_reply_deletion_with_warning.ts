import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCategory";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerationAction";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IDiscussionBoardReply } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardReply";
import type { IDiscussionBoardReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardReport";
import type { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";
import type { IDiscussionBoardTopic } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTopic";

/**
 * Test the moderation workflow for deleting a reply that contains offensive
 * content and issuing a warning to the author.
 *
 * This test validates the complete enforcement chain from content creation
 * through moderation action with proper audit trail.
 *
 * Steps:
 *
 * 1. Create moderator account
 * 2. Create member account for content author
 * 3. Create second member account for reporter
 * 4. Authenticate as moderator and create category
 * 5. Authenticate as author member and create topic
 * 6. Author member posts a reply with offensive content
 * 7. Authenticate as reporter member and report the offensive reply
 * 8. Authenticate as moderator and create moderation action to delete the reply
 *
 * Validations:
 *
 * - Moderation action successfully created for reply deletion
 * - Reply content snapshot is preserved before deletion
 * - Moderator reasoning is comprehensive and meets minimum length
 * - Violation category is properly assigned
 * - Target member ID correctly identifies the violator
 * - Content reference points to the specific reply
 * - Audit trail is complete with all metadata
 */
export async function test_api_moderation_action_reply_deletion_with_warning(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account
  const adminId = typia.random<string & tags.Format<"uuid">>();
  const moderatorAuth: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        appointed_by_admin_id: adminId,
        username: RandomGenerator.alphaNumeric(10),
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(12),
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderatorAuth);

  // Step 2: Create first member account for content author
  const authorAuth: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        username: RandomGenerator.alphaNumeric(10),
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(12),
        display_name: RandomGenerator.name(),
      } satisfies IDiscussionBoardMember.ICreate,
    });
  typia.assert(authorAuth);

  // Step 3: Create second member account for reporting
  const reporterAuth: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        username: RandomGenerator.alphaNumeric(10),
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(12),
        display_name: RandomGenerator.name(),
      } satisfies IDiscussionBoardMember.ICreate,
    });
  typia.assert(reporterAuth);

  // Step 4: Re-authenticate as moderator to create category
  connection.headers = { Authorization: moderatorAuth.token.access };
  const category: IDiscussionBoardCategory =
    await api.functional.discussionBoard.administrator.categories.create(
      connection,
      {
        body: {
          name: "Politics",
          slug: "politics",
          description: "Political discussions and debates",
          parent_category_id: null,
          display_order: 1,
          is_active: true,
        } satisfies IDiscussionBoardCategory.ICreate,
      },
    );
  typia.assert(category);

  // Step 5: Authenticate as author member to create topic
  connection.headers = { Authorization: authorAuth.token.access };
  const topic: IDiscussionBoardTopic =
    await api.functional.discussionBoard.member.topics.create(connection, {
      body: {
        title: RandomGenerator.paragraph({
          sentences: 5,
          wordMin: 3,
          wordMax: 8,
        }),
        body: RandomGenerator.content({
          paragraphs: 2,
          sentenceMin: 10,
          sentenceMax: 15,
        }),
        category_id: category.id,
        tag_ids: null,
      } satisfies IDiscussionBoardTopic.ICreate,
    });
  typia.assert(topic);

  // Step 6: Author member posts a reply with offensive content
  const offensiveContent =
    "This is extremely offensive and hateful content that violates community guidelines";
  const reply: IDiscussionBoardReply =
    await api.functional.discussionBoard.member.topics.replies.create(
      connection,
      {
        topicId: topic.id,
        body: {
          discussion_board_topic_id: topic.id,
          parent_reply_id: null,
          content: offensiveContent,
        } satisfies IDiscussionBoardReply.ICreate,
      },
    );
  typia.assert(reply);

  // Step 7: Authenticate as reporter member to report the offensive reply
  connection.headers = { Authorization: reporterAuth.token.access };
  const report: IDiscussionBoardReport =
    await api.functional.discussionBoard.member.reports.create(connection, {
      body: {
        reported_topic_id: null,
        reported_reply_id: reply.id,
        violation_category: "offensive_language",
        reporter_explanation:
          "This reply contains extremely offensive language that violates our community standards",
      } satisfies IDiscussionBoardReport.ICreate,
    });
  typia.assert(report);

  // Step 8: Authenticate as moderator to create moderation action
  connection.headers = { Authorization: moderatorAuth.token.access };
  const moderationAction: IDiscussionBoardModerationAction =
    await api.functional.discussionBoard.moderator.moderationActions.create(
      connection,
      {
        body: {
          moderator_id: moderatorAuth.id,
          administrator_id: null,
          target_member_id: authorAuth.id,
          related_report_id: report.id,
          content_topic_id: null,
          content_reply_id: reply.id,
          action_type: "delete_content",
          reason:
            "This reply contains offensive language that violates our community guidelines. The content was reported by another member and has been reviewed. Deleting the content and issuing a warning to the author.",
          violation_category: "offensive_language",
          content_snapshot: offensiveContent,
        } satisfies IDiscussionBoardModerationAction.ICreate,
      },
    );
  typia.assert(moderationAction);

  // Validations
  TestValidator.equals(
    "action type is delete_content",
    moderationAction.action_type,
    "delete_content",
  );
  TestValidator.equals(
    "target member is the author",
    moderationAction.target_member_id,
    authorAuth.id,
  );
  TestValidator.equals(
    "content reply ID matches",
    moderationAction.content_reply_id,
    reply.id,
  );
  TestValidator.equals(
    "violation category is offensive_language",
    moderationAction.violation_category,
    "offensive_language",
  );
  TestValidator.equals(
    "content snapshot preserved",
    moderationAction.content_snapshot,
    offensiveContent,
  );
  TestValidator.equals(
    "related report ID matches",
    moderationAction.related_report_id,
    report.id,
  );
  TestValidator.equals(
    "moderator ID matches",
    moderationAction.moderator_id,
    moderatorAuth.id,
  );
  TestValidator.predicate(
    "reason meets minimum length",
    moderationAction.reason.length >= 20,
  );
  TestValidator.predicate(
    "moderation action has ID",
    moderationAction.id.length > 0,
  );
  TestValidator.predicate(
    "created_at is set",
    moderationAction.created_at.length > 0,
  );
}
