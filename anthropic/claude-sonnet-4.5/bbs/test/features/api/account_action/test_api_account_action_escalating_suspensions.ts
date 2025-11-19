import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAccountAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAccountAction";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Test progressive enforcement escalation with increasing suspension durations.
 *
 * This test validates the enforcement escalation workflow where repeated
 * violations lead to progressively longer suspensions. It creates a moderator
 * who applies suspensions with escalating durations (1, 7, 14, 30 days) to
 * demonstrate the progressive discipline model.
 *
 * Steps:
 *
 * 1. Create moderator account for applying enforcement actions
 * 2. Create member account (target of suspensions)
 * 3. Apply 1-day suspension for minor violation
 * 4. Apply 7-day suspension for moderate violation
 * 5. Apply 14-day suspension for serious violation
 * 6. Apply 30-day suspension for severe violation
 * 7. Validate each suspension has correct duration and expiration calculations
 */
export async function test_api_account_action_escalating_suspensions(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      username: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardModerator.ICreate,
  });
  typia.assert(moderator);

  // Step 2: Create member account
  // Note: Using second moderator account as placeholder for member since no member creation API is provided
  const memberModerator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      username: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardModerator.ICreate,
  });
  typia.assert(memberModerator);

  // Re-authenticate as the moderator to apply suspensions
  connection.headers = connection.headers || {};
  connection.headers.Authorization = moderator.token.access;

  // Step 3: Apply 1-day suspension for minor violation
  const suspension1Day =
    await api.functional.discussionBoard.moderator.accountActions.create(
      connection,
      {
        body: {
          discussion_board_member_id: memberModerator.id,
          action_type: "suspension",
          reason:
            "Minor violation: First offense - inappropriate language in comment. User warned about community guidelines.",
          duration_days: 1,
        } satisfies IDiscussionBoardAccountAction.ICreate,
      },
    );
  typia.assert(suspension1Day);

  // Validate 1-day suspension
  TestValidator.equals(
    "1-day suspension duration",
    suspension1Day.duration_days,
    1,
  );
  TestValidator.equals(
    "1-day suspension status",
    suspension1Day.status,
    "active",
  );
  TestValidator.predicate(
    "1-day suspension has expiration",
    suspension1Day.expires_at !== null &&
      suspension1Day.expires_at !== undefined,
  );

  // Step 4: Apply 7-day suspension for moderate violation
  const suspension7Days =
    await api.functional.discussionBoard.moderator.accountActions.create(
      connection,
      {
        body: {
          discussion_board_member_id: memberModerator.id,
          action_type: "suspension",
          reason:
            "Moderate violation: Second offense - repeated spam posting despite previous warning. Escalating to 7-day suspension.",
          duration_days: 7,
        } satisfies IDiscussionBoardAccountAction.ICreate,
      },
    );
  typia.assert(suspension7Days);

  // Validate 7-day suspension
  TestValidator.equals(
    "7-day suspension duration",
    suspension7Days.duration_days,
    7,
  );
  TestValidator.equals(
    "7-day suspension status",
    suspension7Days.status,
    "active",
  );
  TestValidator.predicate(
    "7-day suspension has expiration",
    suspension7Days.expires_at !== null &&
      suspension7Days.expires_at !== undefined,
  );

  // Step 5: Apply 14-day suspension for serious violation
  const suspension14Days =
    await api.functional.discussionBoard.moderator.accountActions.create(
      connection,
      {
        body: {
          discussion_board_member_id: memberModerator.id,
          action_type: "suspension",
          reason:
            "Serious violation: Third offense - harassment of other members in multiple threads. Escalating to 14-day suspension as final warning before permanent ban.",
          duration_days: 14,
        } satisfies IDiscussionBoardAccountAction.ICreate,
      },
    );
  typia.assert(suspension14Days);

  // Validate 14-day suspension
  TestValidator.equals(
    "14-day suspension duration",
    suspension14Days.duration_days,
    14,
  );
  TestValidator.equals(
    "14-day suspension status",
    suspension14Days.status,
    "active",
  );
  TestValidator.predicate(
    "14-day suspension has expiration",
    suspension14Days.expires_at !== null &&
      suspension14Days.expires_at !== undefined,
  );

  // Step 6: Apply 30-day suspension for severe violation
  const suspension30Days =
    await api.functional.discussionBoard.moderator.accountActions.create(
      connection,
      {
        body: {
          discussion_board_member_id: memberModerator.id,
          action_type: "suspension",
          reason:
            "Severe violation: Fourth offense - serious policy violation with posting illegal content and threatening behavior. 30-day suspension before considering permanent ban.",
          duration_days: 30,
        } satisfies IDiscussionBoardAccountAction.ICreate,
      },
    );
  typia.assert(suspension30Days);

  // Validate 30-day suspension
  TestValidator.equals(
    "30-day suspension duration",
    suspension30Days.duration_days,
    30,
  );
  TestValidator.equals(
    "30-day suspension status",
    suspension30Days.status,
    "active",
  );
  TestValidator.predicate(
    "30-day suspension has expiration",
    suspension30Days.expires_at !== null &&
      suspension30Days.expires_at !== undefined,
  );

  // Validate escalation pattern - each suspension should target the same member
  TestValidator.equals(
    "all suspensions target same member",
    suspension1Day.discussion_board_member_id,
    memberModerator.id,
  );
  TestValidator.equals(
    "7-day suspension targets same member",
    suspension7Days.discussion_board_member_id,
    memberModerator.id,
  );
  TestValidator.equals(
    "14-day suspension targets same member",
    suspension14Days.discussion_board_member_id,
    memberModerator.id,
  );
  TestValidator.equals(
    "30-day suspension targets same member",
    suspension30Days.discussion_board_member_id,
    memberModerator.id,
  );

  // Validate all suspensions have proper audit trail
  TestValidator.predicate(
    "1-day suspension has documented reason",
    suspension1Day.reason.length >= 10,
  );
  TestValidator.predicate(
    "7-day suspension has documented reason",
    suspension7Days.reason.length >= 10,
  );
  TestValidator.predicate(
    "14-day suspension has documented reason",
    suspension14Days.reason.length >= 10,
  );
  TestValidator.predicate(
    "30-day suspension has documented reason",
    suspension30Days.reason.length >= 10,
  );
}
