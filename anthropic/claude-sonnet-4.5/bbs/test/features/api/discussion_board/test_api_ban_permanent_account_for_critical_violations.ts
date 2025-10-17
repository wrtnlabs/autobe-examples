import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import type { IDiscussionBoardBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardBan";
import type { IDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCategory";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerationAction";
import type { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";
import type { IDiscussionBoardTopic } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTopic";

/**
 * Test the complete workflow for permanently banning a member account due to
 * critical guideline violations.
 *
 * This scenario validates the graduated enforcement system where an
 * administrator issues a permanent ban after a member has accumulated multiple
 * warnings and suspensions. The test creates a realistic multi-actor scenario
 * with both administrator and member roles, establishes violation context
 * through topic creation, documents the violation investigation through
 * moderation actions, and finally issues a permanent ban with comprehensive
 * justification and appealability settings.
 *
 * Workflow:
 *
 * 1. Administrator authenticates using join to create a new administrator account
 * 2. Member account is created through member join to establish the user who will
 *    be banned
 * 3. Category is created by administrator to enable topic creation
 * 4. Member creates a discussion topic in the category
 * 5. Administrator creates a moderation action documenting the critical violation
 *    and investigation
 * 6. Administrator issues a permanent ban with detailed justification, violation
 *    summary, and appealability settings
 *
 * Validation points:
 *
 * - Verify ban record is created with all required fields
 * - Confirm ban_reason meets minimum 100 characters requirement
 * - Validate violation_summary is present
 * - Check is_appealable flag is set correctly
 * - Verify email_banned is captured to prevent re-registration
 * - Ensure appeal_window_days is set appropriately for appealable bans
 * - Confirm comprehensive audit trail through moderation_action_id
 */
export async function test_api_ban_permanent_account_for_critical_violations(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account with full platform control privileges
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = typia.random<
    string & tags.MinLength<8> & tags.MaxLength<128>
  >();
  const adminUsername = typia.random<
    string &
      tags.MinLength<3> &
      tags.MaxLength<30> &
      tags.Pattern<"^[a-zA-Z0-9_-]+$">
  >();

  const admin: IDiscussionBoardAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        username: adminUsername,
        email: adminEmail,
        password: adminPassword,
      } satisfies IDiscussionBoardAdministrator.ICreate,
    });
  typia.assert(admin);

  // Step 2: Create member account that will be subject to permanent ban
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = typia.random<
    string & tags.MinLength<8> & tags.MaxLength<128>
  >();
  const memberUsername = typia.random<
    string &
      tags.MinLength<3> &
      tags.MaxLength<30> &
      tags.Pattern<"^[a-zA-Z0-9_-]+$">
  >();

  const member: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        username: memberUsername,
        email: memberEmail,
        password: memberPassword,
        display_name: RandomGenerator.name(),
      } satisfies IDiscussionBoardMember.ICreate,
    });
  typia.assert(member);

  // Step 3: Switch to administrator and create category for topic creation
  await api.functional.auth.administrator.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies IDiscussionBoardAdministrator.ILogin,
  });

  const category: IDiscussionBoardCategory =
    await api.functional.discussionBoard.administrator.categories.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(2),
          slug: RandomGenerator.alphabets(10),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          parent_category_id: null,
          display_order: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<0>
          >(),
          is_active: true,
        } satisfies IDiscussionBoardCategory.ICreate,
      },
    );
  typia.assert(category);

  // Step 4: Switch to member account and create a discussion topic
  await api.functional.auth.member.login(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
    } satisfies IDiscussionBoardMember.ILogin,
  });

  const topic: IDiscussionBoardTopic =
    await api.functional.discussionBoard.member.topics.create(connection, {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        body: RandomGenerator.content({ paragraphs: 2 }),
        category_id: category.id,
        tag_ids: null,
      } satisfies IDiscussionBoardTopic.ICreate,
    });
  typia.assert(topic);

  // Step 5: Switch back to administrator and create moderation action documenting the violation
  await api.functional.auth.administrator.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies IDiscussionBoardAdministrator.ILogin,
  });

  const violationReason = RandomGenerator.content({
    paragraphs: 1,
    sentenceMin: 10,
    sentenceMax: 15,
  });

  const moderationAction: IDiscussionBoardModerationAction =
    await api.functional.discussionBoard.administrator.moderationActions.create(
      connection,
      {
        body: {
          administrator_id: admin.id,
          target_member_id: member.id,
          content_topic_id: topic.id,
          action_type: "ban_user",
          reason: violationReason,
          violation_category: "hate_speech",
          content_snapshot: topic.body,
        } satisfies IDiscussionBoardModerationAction.ICreate,
      },
    );
  typia.assert(moderationAction);

  // Step 6: Issue permanent ban with comprehensive justification and appealability settings
  const banReason = RandomGenerator.content({
    paragraphs: 1,
    sentenceMin: 15,
    sentenceMax: 20,
  });
  const violationSummary = RandomGenerator.content({
    paragraphs: 2,
    sentenceMin: 10,
    sentenceMax: 15,
  });

  const ban: IDiscussionBoardBan =
    await api.functional.discussionBoard.administrator.bans.create(connection, {
      body: {
        member_id: member.id,
        moderation_action_id: moderationAction.id,
        ban_reason: banReason,
        violation_summary: violationSummary,
        is_appealable: true,
        appeal_window_days: 30,
        ip_address_banned: null,
        email_banned: memberEmail,
      } satisfies IDiscussionBoardBan.ICreate,
    });
  typia.assert(ban);

  // Validation: Verify ban record has all required fields
  TestValidator.equals("ban member_id matches", ban.member_id, member.id);
  TestValidator.equals(
    "ban moderation_action_id matches",
    ban.moderation_action_id,
    moderationAction.id,
  );
  TestValidator.equals(
    "ban email_banned matches",
    ban.email_banned,
    memberEmail,
  );
  TestValidator.equals("ban is_appealable is true", ban.is_appealable, true);
  TestValidator.equals(
    "ban appeal_window_days is 30",
    ban.appeal_window_days,
    30,
  );
  TestValidator.predicate(
    "ban_reason meets minimum length",
    ban.ban_reason.length >= 100,
  );
  TestValidator.predicate(
    "violation_summary is present",
    ban.violation_summary.length > 0,
  );
  TestValidator.predicate(
    "ban administrator_id matches",
    ban.administrator_id === admin.id,
  );
  TestValidator.predicate("ban is not reversed", ban.is_reversed === false);
  TestValidator.predicate(
    "ban has created_at timestamp",
    ban.created_at.length > 0,
  );
  TestValidator.predicate(
    "ban has updated_at timestamp",
    ban.updated_at.length > 0,
  );
}
