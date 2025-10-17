import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCategory";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerationAction";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IDiscussionBoardReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardReport";
import type { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";
import type { IDiscussionBoardTopic } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTopic";

export async function test_api_moderation_action_content_hiding_for_violation(
  connection: api.IConnection,
) {
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = "SecurePass123!@#";
  const moderatorUsername = typia.random<
    string &
      tags.MinLength<3> &
      tags.MaxLength<30> &
      tags.Pattern<"^[a-zA-Z0-9_-]+$">
  >();
  const adminId = typia.random<string & tags.Format<"uuid">>();

  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        appointed_by_admin_id: adminId,
        username: moderatorUsername,
        email: moderatorEmail,
        password: moderatorPassword,
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator);

  const memberConn: api.IConnection = { ...connection, headers: {} };
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "MemberPass123!@#";
  const memberUsername = typia.random<
    string &
      tags.MinLength<3> &
      tags.MaxLength<30> &
      tags.Pattern<"^[a-zA-Z0-9_-]+$">
  >();

  const member: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(memberConn, {
      body: {
        username: memberUsername,
        email: memberEmail,
        password: memberPassword,
        display_name: RandomGenerator.name(),
      } satisfies IDiscussionBoardMember.ICreate,
    });
  typia.assert(member);

  const reporterConn: api.IConnection = { ...connection, headers: {} };
  const reporterEmail = typia.random<string & tags.Format<"email">>();
  const reporterPassword = "ReporterPass123!@#";
  const reporterUsername = typia.random<
    string &
      tags.MinLength<3> &
      tags.MaxLength<30> &
      tags.Pattern<"^[a-zA-Z0-9_-]+$">
  >();

  const reporter: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(reporterConn, {
      body: {
        username: reporterUsername,
        email: reporterEmail,
        password: reporterPassword,
        display_name: RandomGenerator.name(),
      } satisfies IDiscussionBoardMember.ICreate,
    });
  typia.assert(reporter);

  const categoryName = RandomGenerator.name(2);
  const categorySlug = categoryName.toLowerCase().replace(/\s+/g, "-");

  const category: IDiscussionBoardCategory =
    await api.functional.discussionBoard.administrator.categories.create(
      connection,
      {
        body: {
          name: categoryName,
          slug: categorySlug,
          description: RandomGenerator.paragraph({ sentences: 3 }),
          display_order: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<0>
          >(),
          is_active: true,
        } satisfies IDiscussionBoardCategory.ICreate,
      },
    );
  typia.assert(category);

  const violatingTopicTitle = RandomGenerator.paragraph({
    sentences: 2,
    wordMin: 5,
    wordMax: 10,
  });
  const violatingTopicBody =
    "This is offensive hate speech content that violates community guidelines. " +
    RandomGenerator.content({ paragraphs: 1, sentenceMin: 5, sentenceMax: 10 });

  const topic: IDiscussionBoardTopic =
    await api.functional.discussionBoard.member.topics.create(memberConn, {
      body: {
        title: violatingTopicTitle,
        body: violatingTopicBody,
        category_id: category.id,
        tag_ids: null,
      } satisfies IDiscussionBoardTopic.ICreate,
    });
  typia.assert(topic);

  const violationCategories = [
    "hate_speech",
    "personal_attack",
    "offensive_language",
    "threats",
    "trolling",
  ] as const;
  const selectedViolationCategory = RandomGenerator.pick(violationCategories);

  const report: IDiscussionBoardReport =
    await api.functional.discussionBoard.member.reports.create(reporterConn, {
      body: {
        reported_topic_id: topic.id,
        reported_reply_id: null,
        violation_category: selectedViolationCategory,
        reporter_explanation:
          "This content contains explicit hate speech and offensive language targeting a specific group. It clearly violates our community guidelines.",
      } satisfies IDiscussionBoardReport.ICreate,
    });
  typia.assert(report);

  const moderationActionReason =
    "After reviewing the reported content, it clearly contains hate speech that violates our community standards. The content targets a specific group with derogatory language and promotes harmful stereotypes. This behavior is not acceptable on our platform.";

  const moderationAction: IDiscussionBoardModerationAction =
    await api.functional.discussionBoard.moderator.moderationActions.create(
      connection,
      {
        body: {
          moderator_id: moderator.id,
          administrator_id: null,
          target_member_id: member.id,
          related_report_id: report.id,
          content_topic_id: topic.id,
          content_reply_id: null,
          action_type: "hide_content",
          reason: moderationActionReason,
          violation_category: selectedViolationCategory,
          content_snapshot: violatingTopicBody,
        } satisfies IDiscussionBoardModerationAction.ICreate,
      },
    );
  typia.assert(moderationAction);

  TestValidator.equals(
    "moderation action has moderator ID",
    moderationAction.moderator_id,
    moderator.id,
  );
  TestValidator.equals(
    "moderation action targets correct member",
    moderationAction.target_member_id,
    member.id,
  );
  TestValidator.equals(
    "moderation action linked to report",
    moderationAction.related_report_id,
    report.id,
  );
  TestValidator.equals(
    "moderation action references topic",
    moderationAction.content_topic_id,
    topic.id,
  );
  TestValidator.equals(
    "moderation action type is hide_content",
    moderationAction.action_type,
    "hide_content",
  );
  TestValidator.predicate(
    "moderation action reason is sufficiently detailed",
    moderationAction.reason.length >= 20,
  );
  TestValidator.equals(
    "content snapshot preserved",
    moderationAction.content_snapshot,
    violatingTopicBody,
  );
  TestValidator.equals(
    "violation category recorded",
    moderationAction.violation_category,
    selectedViolationCategory,
  );
  TestValidator.predicate(
    "moderation action not reversed",
    moderationAction.is_reversed === false,
  );
  TestValidator.predicate(
    "creation timestamp exists",
    moderationAction.created_at !== null &&
      moderationAction.created_at !== undefined,
  );
  TestValidator.predicate(
    "update timestamp exists",
    moderationAction.updated_at !== null &&
      moderationAction.updated_at !== undefined,
  );
}
