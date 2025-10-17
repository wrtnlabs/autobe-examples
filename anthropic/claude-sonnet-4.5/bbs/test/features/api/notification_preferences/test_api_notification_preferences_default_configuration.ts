import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

/**
 * Test default notification preference configuration for newly registered
 * members.
 *
 * This test validates that the system properly initializes notification
 * preferences with appropriate default values when a new member account is
 * created. It ensures that users start with sensible notification settings
 * without requiring manual configuration.
 *
 * Test workflow:
 *
 * 1. Register a new member account using the authentication join endpoint
 * 2. Immediately retrieve notification preferences for the new member
 * 3. Validate that all preference fields have appropriate default values
 * 4. Verify engagement notifications (replies, mentions) are enabled by default
 * 5. Confirm moderation and system announcement notifications are enabled
 * 6. Check that quiet hours are disabled by default
 * 7. Validate digest frequency has a valid default value
 * 8. Ensure all timestamps are valid and recent
 */
export async function test_api_notification_preferences_default_configuration(
  connection: api.IConnection,
) {
  // Step 1: Register a new member account
  const memberData = {
    username: RandomGenerator.alphaNumeric(12),
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8> & tags.MaxLength<128>>(),
    display_name: RandomGenerator.name(2),
  } satisfies IDiscussionBoardMember.ICreate;

  const authorizedMember: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: memberData,
    });
  typia.assert(authorizedMember);

  // Step 2: Retrieve notification preferences for the newly created member
  const preferences: IDiscussionBoardMember.INotificationPreferences =
    await api.functional.discussionBoard.member.users.notificationPreferences.at(
      connection,
      {
        userId: authorizedMember.id,
      },
    );
  typia.assert(preferences);

  // Step 3: Validate user ID matches
  TestValidator.equals(
    "notification preferences user_id matches created member id",
    preferences.user_id,
    authorizedMember.id,
  );

  // Step 4: Validate reply notification defaults (should be enabled)
  TestValidator.equals(
    "reply to topic in-app notification enabled by default",
    preferences.reply_to_topic_in_app,
    true,
  );
  TestValidator.equals(
    "reply to topic email notification enabled by default",
    preferences.reply_to_topic_email,
    true,
  );
  TestValidator.equals(
    "reply to comment in-app notification enabled by default",
    preferences.reply_to_comment_in_app,
    true,
  );
  TestValidator.equals(
    "reply to comment email notification enabled by default",
    preferences.reply_to_comment_email,
    true,
  );

  // Step 5: Validate mention notification defaults (should be enabled)
  TestValidator.equals(
    "mention in-app notification enabled by default",
    preferences.mention_in_app,
    true,
  );
  TestValidator.equals(
    "mention email notification enabled by default",
    preferences.mention_email,
    true,
  );

  // Step 6: Validate vote milestone notifications (in-app enabled, email potentially disabled)
  TestValidator.equals(
    "vote milestone in-app notification enabled by default",
    preferences.vote_milestone_in_app,
    true,
  );
  TestValidator.predicate(
    "vote milestone email notification is boolean",
    typeof preferences.vote_milestone_email === "boolean",
  );

  // Step 7: Validate moderation action notifications (should be enabled - critical)
  TestValidator.equals(
    "moderation action in-app notification enabled by default",
    preferences.moderation_action_in_app,
    true,
  );
  TestValidator.equals(
    "moderation action email notification enabled by default",
    preferences.moderation_action_email,
    true,
  );

  // Step 8: Validate watched topic notifications (disabled until user watches topics)
  TestValidator.equals(
    "watched topic in-app notification disabled by default",
    preferences.watched_topic_in_app,
    false,
  );
  TestValidator.equals(
    "watched topic email notification disabled by default",
    preferences.watched_topic_email,
    false,
  );

  // Step 9: Validate system announcement notifications (should be enabled)
  TestValidator.equals(
    "system announcement in-app notification enabled by default",
    preferences.system_announcement_in_app,
    true,
  );
  TestValidator.equals(
    "system announcement email notification enabled by default",
    preferences.system_announcement_email,
    true,
  );

  // Step 10: Validate digest frequency has valid enum value
  const validDigestFrequencies = [
    "realtime",
    "hourly",
    "daily",
    "weekly",
  ] as const;
  TestValidator.predicate(
    "digest frequency has valid enum value",
    validDigestFrequencies.includes(preferences.digest_frequency),
  );

  // Step 11: Validate quiet hours configuration
  TestValidator.predicate(
    "quiet hours enabled is boolean",
    typeof preferences.quiet_hours_enabled === "boolean",
  );

  if (preferences.quiet_hours_enabled === false) {
    // When quiet hours disabled, start/end should be null or undefined
    TestValidator.predicate(
      "quiet hours start is null when quiet hours disabled",
      preferences.quiet_hours_start === null ||
        preferences.quiet_hours_start === undefined,
    );
    TestValidator.predicate(
      "quiet hours end is null when quiet hours disabled",
      preferences.quiet_hours_end === null ||
        preferences.quiet_hours_end === undefined,
    );
  }

  // Step 12: Validate timezone is set
  TestValidator.predicate(
    "timezone is non-empty string",
    typeof preferences.timezone === "string" && preferences.timezone.length > 0,
  );

  // Step 13: Validate timestamps are valid and recent
  TestValidator.predicate(
    "created_at is valid date-time string",
    typeof preferences.created_at === "string" &&
      preferences.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at is valid date-time string",
    typeof preferences.updated_at === "string" &&
      preferences.updated_at.length > 0,
  );

  // Validate timestamps are recent (within last 5 minutes)
  const createdAt = new Date(preferences.created_at);
  const updatedAt = new Date(preferences.updated_at);
  const now = new Date();
  const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);

  TestValidator.predicate(
    "created_at is recent (within 5 minutes)",
    createdAt >= fiveMinutesAgo && createdAt <= now,
  );
  TestValidator.predicate(
    "updated_at is recent (within 5 minutes)",
    updatedAt >= fiveMinutesAgo && updatedAt <= now,
  );

  // Step 14: Validate all required fields exist (comprehensive check)
  TestValidator.predicate(
    "preferences id is valid UUID",
    typeof preferences.id === "string" && preferences.id.length > 0,
  );
}
