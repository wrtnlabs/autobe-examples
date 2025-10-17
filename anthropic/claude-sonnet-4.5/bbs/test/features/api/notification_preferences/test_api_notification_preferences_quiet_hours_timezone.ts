import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

/**
 * Test quiet hours functionality with timezone configuration to ensure
 * notifications respect user time preferences and geographic location.
 *
 * This test validates that users can configure quiet hours (time windows during
 * which email notifications are suppressed) with proper timezone settings. The
 * workflow includes creating a member account, updating notification
 * preferences with quiet hours configured for a specific time window (e.g.,
 * 22:00 to 07:00), and verifying that the system validates timezone identifiers
 * and time formats properly.
 *
 * The test confirms that the response includes the configured quiet hours
 * window and timezone settings, ensuring that digest delivery times and quiet
 * hours enforcement calculations respect the user's local timezone for a
 * personalized notification experience.
 */
export async function test_api_notification_preferences_quiet_hours_timezone(
  connection: api.IConnection,
) {
  // Step 1: Create a new member account through registration
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "SecurePass123!@#";

  const createdMember: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        username: RandomGenerator.alphaNumeric(10),
        email: memberEmail,
        password: memberPassword,
        display_name: RandomGenerator.name(2),
      } satisfies IDiscussionBoardMember.ICreate,
    });
  typia.assert(createdMember);

  // Step 2: Configure notification preferences with quiet hours enabled and timezone
  const timezones = [
    "America/New_York",
    "Europe/London",
    "Asia/Tokyo",
    "America/Los_Angeles",
    "Europe/Paris",
  ] as const;
  const selectedTimezone = RandomGenerator.pick(timezones);

  const updatePreferences = {
    quiet_hours_enabled: true,
    quiet_hours_start: "22:00",
    quiet_hours_end: "07:00",
    timezone: selectedTimezone,
  } satisfies IDiscussionBoardMember.INotificationPreferences.IUpdate;

  const updatedPreferences: IDiscussionBoardMember.INotificationPreferences =
    await api.functional.discussionBoard.member.users.notificationPreferences.update(
      connection,
      {
        userId: createdMember.id,
        body: updatePreferences,
      },
    );
  typia.assert(updatedPreferences);

  // Step 3: Validate quiet hours configuration
  TestValidator.equals(
    "quiet hours should be enabled",
    updatedPreferences.quiet_hours_enabled,
    true,
  );

  TestValidator.equals(
    "quiet hours start time should match configured value",
    updatedPreferences.quiet_hours_start,
    "22:00",
  );

  TestValidator.equals(
    "quiet hours end time should match configured value",
    updatedPreferences.quiet_hours_end,
    "07:00",
  );

  // Step 4: Validate timezone configuration
  TestValidator.equals(
    "timezone should match the configured IANA identifier",
    updatedPreferences.timezone,
    selectedTimezone,
  );

  // Step 5: Verify that the user_id matches the created member
  TestValidator.equals(
    "notification preferences user_id should match member id",
    updatedPreferences.user_id,
    createdMember.id,
  );

  // Step 6: Test with different timezone to ensure flexibility
  const alternativeTimezone = "Australia/Sydney";
  const secondUpdate = {
    timezone: alternativeTimezone,
  } satisfies IDiscussionBoardMember.INotificationPreferences.IUpdate;

  const secondUpdatedPreferences: IDiscussionBoardMember.INotificationPreferences =
    await api.functional.discussionBoard.member.users.notificationPreferences.update(
      connection,
      {
        userId: createdMember.id,
        body: secondUpdate,
      },
    );
  typia.assert(secondUpdatedPreferences);

  TestValidator.equals(
    "timezone should be updated to new IANA identifier",
    secondUpdatedPreferences.timezone,
    alternativeTimezone,
  );

  // Step 7: Verify quiet hours remain enabled after timezone update
  TestValidator.equals(
    "quiet hours should remain enabled after timezone change",
    secondUpdatedPreferences.quiet_hours_enabled,
    true,
  );
}
