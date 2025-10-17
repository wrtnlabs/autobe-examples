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
 * Test permanent ban creation for the most severe violations including illegal
 * content, explicit threats, or doxxing, which are marked as non-appealable to
 * protect the community.
 *
 * This test validates the complete workflow of issuing a non-appealable
 * permanent ban for critical violations that pose immediate threats to platform
 * safety and legal compliance. The test simulates a scenario where a member
 * commits a severe violation (illegal content, explicit threats, or doxxing)
 * that warrants immediate permanent removal without appeal rights.
 *
 * Workflow:
 *
 * 1. Administrator authenticates using join to establish authority for ban
 *    issuance
 * 2. Member account is created through join to serve as the violation target
 * 3. Category is created by administrator to provide context for the violation
 * 4. Member creates topic with severe violation content that triggers moderation
 * 5. Administrator creates moderation action documenting the critical severity
 *    violation with comprehensive investigation details
 * 6. Administrator issues non-appealable permanent ban with is_appealable set to
 *    false, no appeal window, and complete violation documentation
 *
 * Validation points:
 *
 * - Verify ban is created with is_appealable flag set to false
 * - Confirm no appeal_window_days is set for non-appealable bans
 * - Validate ban_reason clearly documents the severe violation type
 * - Check that violation_summary provides comprehensive context
 * - Verify both email_banned and optionally ip_address_banned are captured
 * - Ensure audit trail logs non-appealable status for transparency
 */
export async function test_api_ban_non_appealable_for_severe_violations(
  connection: api.IConnection,
) {
  // Step 1: Administrator authenticates
  const adminCredentials = {
    username: RandomGenerator.alphaNumeric(10),
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8> & tags.MaxLength<128>>(),
  } satisfies IDiscussionBoardAdministrator.ICreate;

  const administrator: IDiscussionBoardAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: adminCredentials,
    });
  typia.assert(administrator);

  // Step 2: Member account is created
  const memberCredentials = {
    username: RandomGenerator.alphaNumeric(10),
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8> & tags.MaxLength<128>>(),
    display_name: RandomGenerator.name(),
  } satisfies IDiscussionBoardMember.ICreate;

  const member: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: memberCredentials,
    });
  typia.assert(member);

  // Step 3: Administrator creates category for violation context
  await api.functional.auth.administrator.login(connection, {
    body: {
      email: adminCredentials.email,
      password: adminCredentials.password,
    } satisfies IDiscussionBoardAdministrator.ILogin,
  });

  const category: IDiscussionBoardCategory =
    await api.functional.discussionBoard.administrator.categories.create(
      connection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          slug: RandomGenerator.alphaNumeric(15),
          description: RandomGenerator.paragraph({ sentences: 5 }),
          parent_category_id: null,
          display_order: 1,
          is_active: true,
        } satisfies IDiscussionBoardCategory.ICreate,
      },
    );
  typia.assert(category);

  // Step 4: Member creates topic with severe violation content
  await api.functional.auth.member.login(connection, {
    body: {
      email: memberCredentials.email,
      password: memberCredentials.password,
    } satisfies IDiscussionBoardMember.ILogin,
  });

  const severeViolationContent = {
    title: "Topic containing illegal content and explicit threats",
    body: "This topic contains severe violation content including illegal material, doxxing information, and explicit threats of violence that warrant immediate permanent ban",
  };

  const topic: IDiscussionBoardTopic =
    await api.functional.discussionBoard.member.topics.create(connection, {
      body: {
        title: severeViolationContent.title,
        body: severeViolationContent.body,
        category_id: category.id,
        tag_ids: null,
      } satisfies IDiscussionBoardTopic.ICreate,
    });
  typia.assert(topic);

  // Step 5: Administrator creates moderation action for critical severity violation
  await api.functional.auth.administrator.login(connection, {
    body: {
      email: adminCredentials.email,
      password: adminCredentials.password,
    } satisfies IDiscussionBoardAdministrator.ILogin,
  });

  const moderationAction: IDiscussionBoardModerationAction =
    await api.functional.discussionBoard.administrator.moderationActions.create(
      connection,
      {
        body: {
          administrator_id: administrator.id,
          target_member_id: member.id,
          content_topic_id: topic.id,
          action_type: "ban_user",
          reason:
            "Critical severity violation: Topic contains illegal content including explicit threats of violence and doxxing information that poses immediate danger to community safety and violates legal requirements. This violation is of such severe nature that it warrants permanent account termination without appeal rights to protect platform integrity and user safety.",
          violation_category: "threats",
          content_snapshot: severeViolationContent.body,
        } satisfies IDiscussionBoardModerationAction.ICreate,
      },
    );
  typia.assert(moderationAction);

  // Step 6: Administrator issues non-appealable permanent ban
  const banData = {
    member_id: member.id,
    moderation_action_id: moderationAction.id,
    ban_reason:
      "Permanent ban issued for posting illegal content including explicit threats of violence and doxxing information. This severe violation poses immediate danger to community members and violates both platform policies and legal requirements. The extreme nature of this violation including threats of physical harm and disclosure of private personal information necessitates immediate permanent removal without appeal opportunity to ensure community safety and legal compliance.",
    violation_summary:
      "Member posted discussion topic containing multiple critical violations: (1) Explicit threats of violence against identified individuals, (2) Doxxing information including private addresses and contact details, (3) Potentially illegal content that violates local laws. The severity and immediate danger posed by this content requires permanent account termination without appeal rights. Member has demonstrated clear intent to cause harm and compromise safety of other community members.",
    is_appealable: false,
    appeal_window_days: null,
    ip_address_banned: "192.168.1.100",
    email_banned: memberCredentials.email,
  } satisfies IDiscussionBoardBan.ICreate;

  const ban: IDiscussionBoardBan =
    await api.functional.discussionBoard.administrator.bans.create(connection, {
      body: banData,
    });
  typia.assert(ban);

  // Validation: Verify ban is created with is_appealable flag set to false
  TestValidator.equals("ban is non-appealable", ban.is_appealable, false);

  // Validation: Confirm no appeal_window_days is set for non-appealable bans
  TestValidator.equals(
    "no appeal window for non-appealable ban",
    ban.appeal_window_days,
    null,
  );

  // Validation: Validate ban_reason clearly documents the severe violation type
  TestValidator.predicate(
    "ban reason contains comprehensive severe violation documentation",
    ban.ban_reason.length >= 100,
  );

  // Validation: Check that violation_summary provides comprehensive context
  TestValidator.predicate(
    "violation summary provides detailed context",
    ban.violation_summary.length > 0,
  );

  // Validation: Verify email_banned is captured
  TestValidator.equals(
    "email banned matches member email",
    ban.email_banned,
    memberCredentials.email,
  );

  // Validation: Verify IP address banned is captured
  TestValidator.equals(
    "IP address banned is captured",
    ban.ip_address_banned,
    "192.168.1.100",
  );

  // Validation: Ensure ban is not reversed
  TestValidator.equals("ban is not reversed", ban.is_reversed, false);

  // Validation: Verify moderation action ID linkage
  TestValidator.equals(
    "ban references correct moderation action",
    ban.moderation_action_id,
    moderationAction.id,
  );

  // Validation: Verify member ID is correctly set
  TestValidator.equals("ban targets correct member", ban.member_id, member.id);
}
