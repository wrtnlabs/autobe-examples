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
 * Test retrieving a warning with moderation action context as a moderator.
 *
 * This test validates the audit trail workflow where warnings are linked to
 * moderation actions. Since no member login API is available, the test operates
 * entirely in moderator context, which has permission to view all warnings and
 * their related moderation actions.
 *
 * Steps:
 *
 * 1. Create member account to receive warning
 * 2. Create moderator account
 * 3. Create moderation action documenting enforcement decision
 * 4. Issue warning to member linked to the moderation action
 * 5. Retrieve the warning as moderator
 * 6. Verify warning includes complete moderation action context
 * 7. Validate audit trail integrity
 */
export async function test_api_warning_retrieval_with_moderation_action_context(
  connection: api.IConnection,
) {
  // Step 1: Create member account
  const memberEmail = typia.random<string & tags.Format<"email">>();

  const member = await api.functional.auth.member.join(connection, {
    body: {
      username: RandomGenerator.alphabets(8),
      email: memberEmail,
      password: "SecurePass123!@#",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardMember.IJoin,
  });
  typia.assert(member);

  // Step 2: Create moderator account (switches authentication context)
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      username: RandomGenerator.alphabets(10),
      email: typia.random<string & tags.Format<"email">>(),
      password: "ModPass456!@#",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardModerator.ICreate,
  });
  typia.assert(moderator);

  // Step 3: Create moderation action as moderator
  const targetContentId = typia.random<string & tags.Format<"uuid">>();
  const moderationAction =
    await api.functional.discussionBoard.moderator.moderation.actions.create(
      connection,
      {
        body: {
          action_type: "delete_content",
          target_type: "article",
          target_id: targetContentId,
          reason: "Spam content promoting commercial services",
          details:
            "Article contained multiple links to external commercial websites with no relevant discussion content",
        } satisfies IDiscussionBoardModerationAction.ICreate,
      },
    );
  typia.assert(moderationAction);

  // Step 4: Issue warning to member linked to moderation action
  const warning =
    await api.functional.discussionBoard.moderator.moderation.warnings.create(
      connection,
      {
        body: {
          discussion_board_member_id: member.id,
          related_moderation_action_id: moderationAction.id,
          warning_reason: "spam",
          warning_details:
            "Your article was removed for containing spam. Please review our community guidelines regarding promotional content and ensure future posts contribute meaningful discussion on economic and political topics.",
          severity: "moderate",
        } satisfies IDiscussionBoardUserWarning.ICreate,
      },
    );
  typia.assert(warning);

  // Step 5: Retrieve the warning as moderator
  const retrievedWarning =
    await api.functional.discussionBoard.moderation.warnings.at(connection, {
      warningId: warning.id,
    });
  typia.assert(retrievedWarning);

  // Step 6: Validate warning basic properties
  TestValidator.equals("warning ID matches", retrievedWarning.id, warning.id);

  TestValidator.equals(
    "warning includes related moderation action ID",
    retrievedWarning.related_moderation_action_id,
    moderationAction.id,
  );

  // Step 7: Validate complete moderation action context is available
  TestValidator.predicate(
    "moderation action context is included",
    retrievedWarning.relatedModerationAction !== null,
  );

  const actionContext = retrievedWarning.relatedModerationAction;
  typia.assertGuard(actionContext!);

  TestValidator.equals(
    "moderation action ID matches",
    actionContext.id,
    moderationAction.id,
  );

  TestValidator.equals(
    "moderation action type is preserved",
    actionContext.action_type,
    "delete_content",
  );

  TestValidator.equals(
    "moderation action target type is preserved",
    actionContext.target_type,
    "article",
  );

  TestValidator.equals(
    "moderation action reason is preserved",
    actionContext.reason,
    "Spam content promoting commercial services",
  );

  // Step 8: Validate audit trail integrity
  TestValidator.equals(
    "warned member ID matches",
    retrievedWarning.discussion_board_member_id,
    member.id,
  );

  TestValidator.equals(
    "warning severity is preserved",
    retrievedWarning.severity,
    "moderate",
  );

  TestValidator.equals(
    "warning reason is preserved",
    retrievedWarning.warning_reason,
    "spam",
  );
}
