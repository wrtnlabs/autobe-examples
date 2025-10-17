import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

/**
 * Test notification preferences ownership validation.
 *
 * Validates that the notification preferences update operation enforces strict
 * ownership validation, ensuring members can only modify their own notification
 * settings and cannot manipulate other users' preferences.
 *
 * Test workflow:
 *
 * 1. Create first member account through registration
 * 2. Create second member account through registration
 * 3. Authenticate as first member and attempt unauthorized update
 * 4. Verify authorization error is returned
 * 5. Authenticate as second member
 * 6. Successfully update own notification preferences
 * 7. Verify preferences are correctly applied
 */
export async function test_api_notification_preferences_ownership_validation(
  connection: api.IConnection,
) {
  // Step 1: Create first member account
  const firstMemberEmail = typia.random<string & tags.Format<"email">>();
  const firstMemberPassword = typia.random<
    string & tags.MinLength<8> & tags.MaxLength<128>
  >();
  const firstMember: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        username: RandomGenerator.alphaNumeric(8),
        email: firstMemberEmail,
        password: firstMemberPassword,
        display_name: RandomGenerator.name(),
      } satisfies IDiscussionBoardMember.ICreate,
    });
  typia.assert(firstMember);

  // Step 2: Create second member account
  const secondMemberEmail = typia.random<string & tags.Format<"email">>();
  const secondMemberPassword = typia.random<
    string & tags.MinLength<8> & tags.MaxLength<128>
  >();
  const secondMember: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        username: RandomGenerator.alphaNumeric(8),
        email: secondMemberEmail,
        password: secondMemberPassword,
        display_name: RandomGenerator.name(),
      } satisfies IDiscussionBoardMember.ICreate,
    });
  typia.assert(secondMember);

  // Step 3: Create unauthenticated connection for first member login
  const firstMemberConnection: api.IConnection = { ...connection, headers: {} };
  await api.functional.auth.member.join(firstMemberConnection, {
    body: {
      username: RandomGenerator.alphaNumeric(8),
      email: firstMemberEmail,
      password: firstMemberPassword,
      display_name: RandomGenerator.name(),
    } satisfies IDiscussionBoardMember.ICreate,
  });

  // Step 4: Attempt to update second member's notification preferences (should fail)
  await TestValidator.error(
    "first member cannot update second member's notification preferences",
    async () => {
      await api.functional.discussionBoard.member.users.notificationPreferences.update(
        firstMemberConnection,
        {
          userId: secondMember.id,
          body: {
            reply_to_topic_in_app: false,
            reply_to_topic_email: false,
          } satisfies IDiscussionBoardMember.INotificationPreferences.IUpdate,
        },
      );
    },
  );

  // Step 5: Create unauthenticated connection for second member
  const secondMemberConnection: api.IConnection = {
    ...connection,
    headers: {},
  };
  await api.functional.auth.member.join(secondMemberConnection, {
    body: {
      username: RandomGenerator.alphaNumeric(8),
      email: secondMemberEmail,
      password: secondMemberPassword,
      display_name: RandomGenerator.name(),
    } satisfies IDiscussionBoardMember.ICreate,
  });

  // Step 6: Successfully update second member's own notification preferences
  const updatedPreferences: IDiscussionBoardMember.INotificationPreferences =
    await api.functional.discussionBoard.member.users.notificationPreferences.update(
      secondMemberConnection,
      {
        userId: secondMember.id,
        body: {
          reply_to_topic_in_app: false,
          reply_to_topic_email: true,
          mention_in_app: true,
          mention_email: false,
          digest_frequency: "daily",
          quiet_hours_enabled: true,
          quiet_hours_start: "22:00",
          quiet_hours_end: "07:00",
          timezone: "America/New_York",
        } satisfies IDiscussionBoardMember.INotificationPreferences.IUpdate,
      },
    );
  typia.assert(updatedPreferences);

  // Step 7: Verify the updated preferences
  TestValidator.equals(
    "user ID matches",
    updatedPreferences.user_id,
    secondMember.id,
  );
  TestValidator.equals(
    "reply to topic in app is disabled",
    updatedPreferences.reply_to_topic_in_app,
    false,
  );
  TestValidator.equals(
    "reply to topic email is enabled",
    updatedPreferences.reply_to_topic_email,
    true,
  );
  TestValidator.equals(
    "mention in app is enabled",
    updatedPreferences.mention_in_app,
    true,
  );
  TestValidator.equals(
    "mention email is disabled",
    updatedPreferences.mention_email,
    false,
  );
  TestValidator.equals(
    "digest frequency is daily",
    updatedPreferences.digest_frequency,
    "daily",
  );
  TestValidator.equals(
    "quiet hours enabled",
    updatedPreferences.quiet_hours_enabled,
    true,
  );
  TestValidator.equals(
    "quiet hours start time",
    updatedPreferences.quiet_hours_start,
    "22:00",
  );
  TestValidator.equals(
    "quiet hours end time",
    updatedPreferences.quiet_hours_end,
    "07:00",
  );
  TestValidator.equals(
    "timezone is correct",
    updatedPreferences.timezone,
    "America/New_York",
  );
}
