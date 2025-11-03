import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerationAction";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IDiscussionBoardReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardReport";
import type { IDiscussionBoardUserWarning } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUserWarning";

/**
 * Test the complete moderation workflow where a warning is issued as part of a
 * formal moderation action chain.
 *
 * This test validates the audit trail from content report through moderation
 * action to warning issuance.
 *
 * Workflow:
 *
 * 1. Create and authenticate a moderator account via join
 * 2. Create a member account who will receive the warning
 * 3. Create a moderation action record documenting the moderator intervention
 * 4. Issue a warning that references the related moderation action ID
 * 5. Validate the warning is properly linked to the moderation action for complete
 *    audit trail
 * 6. Verify the warning record includes the related_moderation_action_id
 *    establishing the enforcement decision chain
 */
export async function test_api_warning_creation_with_moderation_action_reference(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate a moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        username: RandomGenerator.alphaNumeric(10),
        email: moderatorEmail,
        password: typia.random<string & tags.MinLength<8>>(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 2: Create a member account who will receive the warning
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member: IDiscussionBoardMember.ISummary =
    await api.functional.discussionBoard.members.create(connection, {
      body: {
        username: RandomGenerator.alphaNumeric(10),
        email: memberEmail,
        password: typia.random<string & tags.MinLength<8>>(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IDiscussionBoardMember.ICreate,
    });
  typia.assert(member);

  // Step 3: Create a moderation action record documenting the moderator intervention
  const actionTypes = ["warn_user", "edit_content", "delete_content"] as const;
  const targetTypes = ["user", "article", "comment"] as const;

  const moderationAction: IDiscussionBoardModerationAction =
    await api.functional.discussionBoard.moderator.moderation.actions.create(
      connection,
      {
        body: {
          action_type: RandomGenerator.pick(actionTypes),
          target_type: RandomGenerator.pick(targetTypes),
          target_id: typia.random<string & tags.Format<"uuid">>(),
          reason: RandomGenerator.paragraph({ sentences: 2 }),
          details: RandomGenerator.paragraph({ sentences: 5 }),
        } satisfies IDiscussionBoardModerationAction.ICreate,
      },
    );
  typia.assert(moderationAction);

  // Step 4: Issue a warning that references the related moderation action ID
  const severities = ["minor", "moderate", "severe"] as const;

  const warning: IDiscussionBoardUserWarning =
    await api.functional.discussionBoard.moderator.moderation.warnings.create(
      connection,
      {
        body: {
          discussion_board_member_id: member.id,
          related_moderation_action_id: moderationAction.id,
          warning_reason: RandomGenerator.paragraph({ sentences: 1 }),
          warning_details: RandomGenerator.paragraph({ sentences: 4 }),
          severity: RandomGenerator.pick(severities),
        } satisfies IDiscussionBoardUserWarning.ICreate,
      },
    );
  typia.assert(warning);

  // Step 5: Validate the warning is properly linked to the moderation action
  TestValidator.equals(
    "warning references moderation action",
    warning.related_moderation_action_id,
    moderationAction.id,
  );

  // Step 6: Verify complete audit trail establishment
  TestValidator.predicate(
    "warning has related moderation action summary",
    warning.relatedModerationAction !== null &&
      warning.relatedModerationAction !== undefined,
  );

  if (warning.relatedModerationAction) {
    TestValidator.equals(
      "related moderation action ID matches",
      warning.relatedModerationAction.id,
      moderationAction.id,
    );
  }

  // Additional validations
  TestValidator.equals(
    "warned member ID matches",
    warning.discussion_board_member_id,
    member.id,
  );

  TestValidator.equals(
    "issuing moderator ID matches",
    warning.discussion_board_moderator_id,
    moderator.id,
  );
}
