import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

/**
 * Test the complete workflow of updating notification preferences for an
 * authenticated member.
 *
 * This test validates the entire notification preferences update workflow
 * including:
 *
 * 1. Creating a new member account to establish authentication context
 * 2. Updating comprehensive notification preferences with all configuration
 *    options
 * 3. Verifying the response contains the updated preferences reflecting all
 *    changes
 *
 * The test configures event-type toggles (replies, mentions, votes), delivery
 * channels (in-app and email), digest frequency settings, quiet hours with time
 * windows, and timezone preferences. It validates that the system accepts valid
 * configurations and returns the updated preference state.
 */
export async function test_api_notification_preferences_update_by_member(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate a new member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "SecurePass123!@#";

  const memberData = {
    username: RandomGenerator.alphaNumeric(10),
    email: memberEmail,
    password: memberPassword,
    display_name: RandomGenerator.name(2),
  } satisfies IDiscussionBoardMember.ICreate;

  const authorizedMember: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: memberData,
    });
  typia.assert(authorizedMember);

  // Step 2: Prepare comprehensive notification preferences update
  const digestFrequencies = ["realtime", "hourly", "daily", "weekly"] as const;
  const selectedDigestFrequency = RandomGenerator.pick(digestFrequencies);

  const quietHoursEnabled = RandomGenerator.pick([true, false] as const);

  const updatePreferences = {
    reply_to_topic_in_app: true,
    reply_to_topic_email: true,
    reply_to_comment_in_app: true,
    reply_to_comment_email: false,
    mention_in_app: true,
    mention_email: true,
    vote_milestone_in_app: true,
    vote_milestone_email: false,
    moderation_action_in_app: true,
    moderation_action_email: true,
    watched_topic_in_app: false,
    watched_topic_email: false,
    system_announcement_in_app: true,
    system_announcement_email: true,
    digest_frequency: selectedDigestFrequency,
    quiet_hours_enabled: quietHoursEnabled,
    quiet_hours_start: quietHoursEnabled ? "22:00" : null,
    quiet_hours_end: quietHoursEnabled ? "07:00" : null,
    timezone: "America/New_York",
  } satisfies IDiscussionBoardMember.INotificationPreferences.IUpdate;

  // Step 3: Update notification preferences for the authenticated member
  const updatedPreferences: IDiscussionBoardMember.INotificationPreferences =
    await api.functional.discussionBoard.member.users.notificationPreferences.update(
      connection,
      {
        userId: authorizedMember.id,
        body: updatePreferences,
      },
    );
  typia.assert(updatedPreferences);

  // Step 4: Validate the response contains updated preference values
  TestValidator.equals(
    "reply to topic in-app notification enabled",
    updatedPreferences.reply_to_topic_in_app,
    true,
  );

  TestValidator.equals(
    "reply to topic email notification enabled",
    updatedPreferences.reply_to_topic_email,
    true,
  );

  TestValidator.equals(
    "reply to comment in-app notification enabled",
    updatedPreferences.reply_to_comment_in_app,
    true,
  );

  TestValidator.equals(
    "reply to comment email notification disabled",
    updatedPreferences.reply_to_comment_email,
    false,
  );

  TestValidator.equals(
    "mention in-app notification enabled",
    updatedPreferences.mention_in_app,
    true,
  );

  TestValidator.equals(
    "mention email notification enabled",
    updatedPreferences.mention_email,
    true,
  );

  TestValidator.equals(
    "vote milestone in-app notification enabled",
    updatedPreferences.vote_milestone_in_app,
    true,
  );

  TestValidator.equals(
    "vote milestone email notification disabled",
    updatedPreferences.vote_milestone_email,
    false,
  );

  TestValidator.equals(
    "moderation action in-app notification enabled",
    updatedPreferences.moderation_action_in_app,
    true,
  );

  TestValidator.equals(
    "moderation action email notification enabled",
    updatedPreferences.moderation_action_email,
    true,
  );

  TestValidator.equals(
    "watched topic in-app notification disabled",
    updatedPreferences.watched_topic_in_app,
    false,
  );

  TestValidator.equals(
    "watched topic email notification disabled",
    updatedPreferences.watched_topic_email,
    false,
  );

  TestValidator.equals(
    "system announcement in-app notification enabled",
    updatedPreferences.system_announcement_in_app,
    true,
  );

  TestValidator.equals(
    "system announcement email notification enabled",
    updatedPreferences.system_announcement_email,
    true,
  );

  TestValidator.equals(
    "digest frequency matches update",
    updatedPreferences.digest_frequency,
    selectedDigestFrequency,
  );

  TestValidator.equals(
    "quiet hours enabled matches update",
    updatedPreferences.quiet_hours_enabled,
    quietHoursEnabled,
  );

  if (quietHoursEnabled) {
    TestValidator.equals(
      "quiet hours start time is set",
      updatedPreferences.quiet_hours_start,
      "22:00",
    );

    TestValidator.equals(
      "quiet hours end time is set",
      updatedPreferences.quiet_hours_end,
      "07:00",
    );
  }

  TestValidator.equals(
    "timezone is set correctly",
    updatedPreferences.timezone,
    "America/New_York",
  );

  TestValidator.equals(
    "user ID matches authenticated member",
    updatedPreferences.user_id,
    authorizedMember.id,
  );

  // Verify the response includes required system fields
  TestValidator.predicate(
    "preferences ID is valid UUID",
    typia.is<string & tags.Format<"uuid">>(updatedPreferences.id),
  );

  TestValidator.predicate(
    "created_at timestamp is valid",
    typia.is<string & tags.Format<"date-time">>(updatedPreferences.created_at),
  );

  TestValidator.predicate(
    "updated_at timestamp is valid",
    typia.is<string & tags.Format<"date-time">>(updatedPreferences.updated_at),
  );
}
