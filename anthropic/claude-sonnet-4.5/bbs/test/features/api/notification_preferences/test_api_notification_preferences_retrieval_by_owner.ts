import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

/**
 * Test successful retrieval of notification preferences by the account owner.
 *
 * This test validates that a member can retrieve their complete notification
 * preference configuration after account creation. It ensures all preference
 * fields are present with appropriate default values.
 *
 * Steps:
 *
 * 1. Create a new member account through join endpoint
 * 2. Retrieve notification preferences for that member using their user ID
 * 3. Validate the complete preference structure is returned
 *
 * Validations:
 *
 * - All event-type notification settings are returned
 * - Both in-app and email channel settings exist for each event type
 * - Digest frequency configuration is included
 * - Quiet hours settings are returned
 * - Timezone configuration is present
 * - User ID matches the created member
 */
export async function test_api_notification_preferences_retrieval_by_owner(
  connection: api.IConnection,
) {
  // Step 1: Create a new member account
  const memberRegistration = {
    username: RandomGenerator.alphaNumeric(12),
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8> & tags.MaxLength<128>>(),
    display_name: RandomGenerator.name(),
  } satisfies IDiscussionBoardMember.ICreate;

  const authorizedMember: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: memberRegistration,
    });
  typia.assert(authorizedMember);

  // Step 2: Retrieve notification preferences for the created member
  const preferences: IDiscussionBoardMember.INotificationPreferences =
    await api.functional.discussionBoard.member.users.notificationPreferences.at(
      connection,
      {
        userId: authorizedMember.id,
      },
    );
  typia.assert(preferences);

  // Step 3: Validate business logic - user_id matches created member
  TestValidator.equals(
    "preferences user_id matches created member",
    preferences.user_id,
    authorizedMember.id,
  );
}
