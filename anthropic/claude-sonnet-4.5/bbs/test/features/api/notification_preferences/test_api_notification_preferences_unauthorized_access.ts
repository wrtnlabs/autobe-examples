import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

/**
 * Test security enforcement preventing users from accessing other users'
 * notification preferences.
 *
 * This test validates the authorization layer protecting user privacy in
 * notification settings. It ensures that authenticated users can only access
 * their own notification preferences and cannot retrieve preferences belonging
 * to other users, even with a valid authentication token.
 *
 * Test workflow:
 *
 * 1. Create first member account (owner of preferences)
 * 2. Create second member account (unauthorized user)
 * 3. Second member attempts to retrieve first member's notification preferences
 * 4. Verify access is denied with appropriate error response
 *
 * Expected outcome: API returns error (403 Forbidden) preventing unauthorized
 * access to sensitive notification configuration data.
 */
export async function test_api_notification_preferences_unauthorized_access(
  connection: api.IConnection,
) {
  // Step 1: Create first member account (owner of the notification preferences)
  const firstMemberEmail = typia.random<string & tags.Format<"email">>();
  const firstMember = await api.functional.auth.member.join(connection, {
    body: {
      username: RandomGenerator.alphaNumeric(10),
      email: firstMemberEmail,
      password: typia.random<
        string & tags.MinLength<8> & tags.MaxLength<128>
      >(),
      display_name: RandomGenerator.name(2),
    } satisfies IDiscussionBoardMember.ICreate,
  });
  typia.assert(firstMember);

  // Step 2: Create second member account (unauthorized user who will attempt access)
  const secondMemberEmail = typia.random<string & tags.Format<"email">>();
  const secondMember = await api.functional.auth.member.join(connection, {
    body: {
      username: RandomGenerator.alphaNumeric(10),
      email: secondMemberEmail,
      password: typia.random<
        string & tags.MinLength<8> & tags.MaxLength<128>
      >(),
      display_name: RandomGenerator.name(2),
    } satisfies IDiscussionBoardMember.ICreate,
  });
  typia.assert(secondMember);

  // Step 3: Second member (now authenticated) attempts to access first member's notification preferences
  // This should fail because the authenticated user (secondMember) is trying to access
  // notification preferences for a different user (firstMember)
  await TestValidator.error(
    "unauthorized user cannot access another user's notification preferences",
    async () => {
      await api.functional.discussionBoard.member.users.notificationPreferences.at(
        connection,
        {
          userId: firstMember.id,
        },
      );
    },
  );
}
