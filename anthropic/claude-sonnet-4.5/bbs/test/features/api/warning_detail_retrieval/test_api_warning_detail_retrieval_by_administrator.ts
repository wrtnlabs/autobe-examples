import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import type { IDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCategory";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerationAction";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IDiscussionBoardReply } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardReply";
import type { IDiscussionBoardReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardReport";
import type { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";
import type { IDiscussionBoardTopic } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTopic";
import type { IDiscussionBoardWarning } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardWarning";

/**
 * Test the workflow of creating a moderation action that issues a warning for
 * guideline violations.
 *
 * This test validates that moderators can create moderation actions with
 * warning issuance for content that violates community guidelines. Due to API
 * limitations (no way to retrieve the generated warning ID), we validate the
 * moderation action properties instead of the warning entity itself.
 *
 * Workflow:
 *
 * 1. Administrator joins and authenticates
 * 2. Administrator creates a category for discussion topics
 * 3. Member joins and creates a topic
 * 4. Member creates a reply that violates guidelines
 * 5. Another member joins and reports the violation
 * 6. Moderator joins and creates moderation action with warning
 * 7. Validate moderation action properties
 */
export async function test_api_warning_detail_retrieval_by_administrator(
  connection: api.IConnection,
) {
  // 1. Administrator joins the platform
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = typia.random<
    string & tags.MinLength<8> & tags.MaxLength<128>
  >();

  const admin = await api.functional.auth.administrator.join(connection, {
    body: {
      username: typia.random<
        string &
          tags.MinLength<3> &
          tags.MaxLength<30> &
          tags.Pattern<"^[a-zA-Z0-9_-]+$">
      >(),
      email: adminEmail,
      password: adminPassword,
    } satisfies IDiscussionBoardAdministrator.ICreate,
  });
  typia.assert(admin);

  // 2. Administrator creates a category
  const category =
    await api.functional.discussionBoard.administrator.categories.create(
      connection,
      {
        body: {
          name: typia.random<string & tags.MinLength<3> & tags.MaxLength<50>>(),
          slug: typia.random<string & tags.Pattern<"^[a-z0-9-]+$">>(),
          description: RandomGenerator.paragraph({ sentences: 5 }),
          parent_category_id: null,
          display_order: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<0>
          >(),
          is_active: true,
        } satisfies IDiscussionBoardCategory.ICreate,
      },
    );
  typia.assert(category);

  // 3. Member joins to create content
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = typia.random<
    string & tags.MinLength<8> & tags.MaxLength<128>
  >();

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

  // 4. Member creates a discussion topic
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

  // 5. Member creates a reply that violates community guidelines
  const violatingReply =
    await api.functional.discussionBoard.member.topics.replies.create(
      connection,
      {
        topicId: topic.id,
        body: {
          discussion_board_topic_id: topic.id,
          parent_reply_id: null,
          content:
            "This is offensive language that violates community guidelines and contains personal attacks against other users.",
        } satisfies IDiscussionBoardReply.ICreate,
      },
    );
  typia.assert(violatingReply);

  // 6. Another member joins to report the violation
  const reporterEmail = typia.random<string & tags.Format<"email">>();
  const reporterPassword = typia.random<
    string & tags.MinLength<8> & tags.MaxLength<128>
  >();

  await api.functional.auth.member.join(connection, {
    body: {
      username: typia.random<
        string &
          tags.MinLength<3> &
          tags.MaxLength<30> &
          tags.Pattern<"^[a-zA-Z0-9_-]+$">
      >(),
      email: reporterEmail,
      password: reporterPassword,
      display_name: RandomGenerator.name(),
    } satisfies IDiscussionBoardMember.ICreate,
  });

  // 7. Member reports the violating reply
  const report = await api.functional.discussionBoard.member.reports.create(
    connection,
    {
      body: {
        reported_topic_id: null,
        reported_reply_id: violatingReply.id,
        violation_category: "offensive_language",
        reporter_explanation:
          "This reply contains offensive language and personal attacks that violate our community guidelines.",
      } satisfies IDiscussionBoardReport.ICreate,
    },
  );
  typia.assert(report);

  // 8. Moderator joins to handle moderation
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = typia.random<
    string & tags.MinLength<8> & tags.MaxLength<128>
  >();

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
      password: moderatorPassword,
    } satisfies IDiscussionBoardModerator.ICreate,
  });
  typia.assert(moderator);

  // 9. Moderator creates moderation action with warning
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
            "Your reply contains offensive language that violates our community guidelines. Please review our policies and maintain respectful discourse.",
          violation_category: "offensive_language",
          content_snapshot: violatingReply.content,
        } satisfies IDiscussionBoardModerationAction.ICreate,
      },
    );
  typia.assert(moderationAction);

  // Validate moderation action properties
  TestValidator.equals(
    "moderation action references correct moderator",
    moderationAction.moderator_id,
    moderator.id,
  );
  TestValidator.equals(
    "moderation action references correct member",
    moderationAction.target_member_id,
    member.id,
  );
  TestValidator.equals(
    "moderation action references report",
    moderationAction.related_report_id,
    report.id,
  );
  TestValidator.equals(
    "moderation action references violating reply",
    moderationAction.content_reply_id,
    violatingReply.id,
  );
  TestValidator.equals(
    "moderation action type is issue_warning",
    moderationAction.action_type,
    "issue_warning",
  );
  TestValidator.equals(
    "moderation action has correct violation category",
    moderationAction.violation_category,
    "offensive_language",
  );
  TestValidator.predicate(
    "moderation action reason is meaningful",
    moderationAction.reason.length >= 20,
  );
  TestValidator.equals(
    "moderation action preserves content snapshot",
    moderationAction.content_snapshot,
    violatingReply.content,
  );
  TestValidator.predicate(
    "moderation action is not reversed",
    moderationAction.is_reversed === false,
  );
}
