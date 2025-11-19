import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardNotificationPreference } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardNotificationPreference";

/**
 * Test retrieval of specific notification preference configuration by ID.
 *
 * This test validates that authenticated members can access their notification
 * preference details using the preference ID. The test creates a new member
 * account, establishes authentication context, retrieves the preference
 * configuration to obtain a preference ID, and then tests the specific
 * retrieval endpoint to verify all notification settings are properly
 * returned.
 */
export async function test_api_notification_preference_retrieval_by_id(
  connection: api.IConnection,
) {
  // 1. Create new member account and establish authentication context
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      username: RandomGenerator.paragraph({
        sentences: 2,
        wordMin: 3,
        wordMax: 7,
      }).replace(/ /g, ""),
      password: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.paragraph({ sentences: 2 }),
      bio: RandomGenerator.paragraph({ sentences: 4 }),
      href: "https://example.com/register",
      referrer: "https://example.com",
    } satisfies IDiscussionBoardMember.ICreate,
  });
  typia.assert(member);

  // 2. Retrieve member's notification preference configuration to obtain the preference ID
  const preferences =
    await api.functional.discussionBoard.member.notificationPreferences.get(
      connection,
    );
  typia.assert(preferences);

  // Verify the preference belongs to the authenticated member
  TestValidator.equals(
    "preference belongs to authenticated member",
    preferences.discussion_board_member_id,
    member.id,
  );

  // 3. Test specific preference retrieval by ID
  const specificPreference =
    await api.functional.discussionBoard.member.notificationPreferences.at(
      connection,
      {
        preferenceId: preferences.id,
      },
    );
  typia.assert(specificPreference);

  // 4. Validate that the retrieved preference matches the original
  TestValidator.equals(
    "retrieved preference matches original",
    specificPreference,
    preferences,
  );

  // 5. Validate specific preference fields
  TestValidator.equals(
    "preference ID matches",
    specificPreference.id,
    preferences.id,
  );
  TestValidator.equals(
    "member ID matches",
    specificPreference.discussion_board_member_id,
    member.id,
  );

  // Validate frequency is one of the allowed values
  const validFrequencies = [
    "immediate",
    "daily_digest",
    "weekly_digest",
  ] as const;
  TestValidator.predicate(
    "frequency is valid value",
    validFrequencies.includes(specificPreference.frequency),
  );
}
