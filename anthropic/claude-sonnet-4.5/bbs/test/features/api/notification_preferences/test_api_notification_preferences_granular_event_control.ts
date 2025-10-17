import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

/**
 * Test the granular per-event-type notification control system allowing users
 * to customize notifications for different platform events independently.
 *
 * This test validates the notification preferences API's ability to handle
 * fine-grained per-event-type notification settings. The test follows this
 * workflow:
 *
 * 1. Create a member account through registration
 * 2. Update notification preferences with varied configurations for different
 *    event types
 * 3. Verify the system persists independent event-type configurations
 * 4. Confirm granular control over notification channels (in-app vs email)
 */
export async function test_api_notification_preferences_granular_event_control(
  connection: api.IConnection,
) {
  // Step 1: Create a member account
  const memberData = {
    username: RandomGenerator.alphaNumeric(10),
    email: typia.random<string & tags.Format<"email">>(),
    password: "SecureP@ssw0rd123",
    display_name: RandomGenerator.name(),
  } satisfies IDiscussionBoardMember.ICreate;

  const member: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: memberData,
    });
  typia.assert(member);

  // Step 2: Update notification preferences with granular event-type configurations
  const preferencesUpdate = {
    reply_to_topic_in_app: true,
    reply_to_topic_email: false,
    mention_in_app: true,
    mention_email: true,
    vote_milestone_in_app: false,
    vote_milestone_email: false,
    moderation_action_in_app: false,
    moderation_action_email: true,
  } satisfies IDiscussionBoardMember.INotificationPreferences.IUpdate;

  const updatedPreferences: IDiscussionBoardMember.INotificationPreferences =
    await api.functional.discussionBoard.member.users.notificationPreferences.update(
      connection,
      {
        userId: member.id,
        body: preferencesUpdate,
      },
    );
  typia.assert(updatedPreferences);

  // Step 3: Verify the preferences were persisted correctly
  TestValidator.equals(
    "reply_to_topic in-app should be enabled",
    updatedPreferences.reply_to_topic_in_app,
    true,
  );
  TestValidator.equals(
    "reply_to_topic email should be disabled",
    updatedPreferences.reply_to_topic_email,
    false,
  );
  TestValidator.equals(
    "mention in-app should be enabled",
    updatedPreferences.mention_in_app,
    true,
  );
  TestValidator.equals(
    "mention email should be enabled",
    updatedPreferences.mention_email,
    true,
  );
  TestValidator.equals(
    "vote_milestone in-app should be disabled",
    updatedPreferences.vote_milestone_in_app,
    false,
  );
  TestValidator.equals(
    "vote_milestone email should be disabled",
    updatedPreferences.vote_milestone_email,
    false,
  );
  TestValidator.equals(
    "moderation_action in-app should be disabled",
    updatedPreferences.moderation_action_in_app,
    false,
  );
  TestValidator.equals(
    "moderation_action email should be enabled",
    updatedPreferences.moderation_action_email,
    true,
  );

  // Step 4: Verify user_id matches the created member
  TestValidator.equals(
    "user_id should match created member",
    updatedPreferences.user_id,
    member.id,
  );
}
