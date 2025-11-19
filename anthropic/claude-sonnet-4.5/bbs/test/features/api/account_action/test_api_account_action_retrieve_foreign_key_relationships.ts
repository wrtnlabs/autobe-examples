import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAccountAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAccountAction";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Test that retrieved account action includes complete foreign key relationship
 * data.
 *
 * This test validates the integrity of foreign key relationships in account
 * action records by verifying that discussion_board_member_id and
 * discussion_board_moderator_id correctly reference their respective entities.
 *
 * Test workflow:
 *
 * 1. Create and authenticate moderator
 * 2. Create member account with specific profile
 * 3. Apply account action (suspension) to the member
 * 4. Retrieve action and validate member and moderator foreign key references
 *
 * This ensures accountability tracking through proper relationship references.
 */
export async function test_api_account_action_retrieve_foreign_key_relationships(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate moderator
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = typia.random<string & tags.Format<"password">>();
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      password: moderatorPassword,
      username: RandomGenerator.alphaNumeric(10),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardModerator.ICreate,
  });
  typia.assert(moderator);

  // Step 2: Create member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: typia.random<string & tags.Format<"password">>(),
      username: RandomGenerator.alphaNumeric(10),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 3 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardMember.ICreate,
  });
  typia.assert(member);

  // Step 3: Re-authenticate as moderator to apply action
  await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      password: moderatorPassword,
      username: RandomGenerator.alphaNumeric(10),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardModerator.ICreate,
  });

  // Step 4: Apply account action to member
  const accountAction =
    await api.functional.discussionBoard.moderator.accountActions.create(
      connection,
      {
        body: {
          discussion_board_member_id: member.id,
          action_type: "suspension" as const,
          reason: RandomGenerator.paragraph({
            sentences: 5,
            wordMin: 5,
            wordMax: 10,
          }),
          duration_days: 7,
        } satisfies IDiscussionBoardAccountAction.ICreate,
      },
    );
  typia.assert(accountAction);

  // Step 5: Retrieve action and validate foreign key relationships
  const retrievedAction =
    await api.functional.discussionBoard.moderator.accountActions.at(
      connection,
      {
        actionId: accountAction.id,
      },
    );
  typia.assert(retrievedAction);

  // Validate foreign key relationships match expected entity IDs
  TestValidator.equals(
    "discussion_board_member_id matches created member",
    retrievedAction.discussion_board_member_id,
    member.id,
  );

  TestValidator.equals(
    "discussion_board_moderator_id matches moderator who created action",
    retrievedAction.discussion_board_moderator_id,
    moderator.id,
  );
}
