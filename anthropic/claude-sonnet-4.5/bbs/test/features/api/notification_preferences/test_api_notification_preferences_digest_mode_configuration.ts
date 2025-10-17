import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

/**
 * Test digest mode configuration that batches multiple notifications into
 * periodic summaries.
 *
 * This test validates the notification preferences digest mode feature which
 * allows users to batch notifications into periodic summaries (hourly, daily,
 * weekly) instead of receiving immediate real-time notifications. This prevents
 * notification fatigue for highly active users while maintaining information
 * delivery.
 *
 * The test workflow:
 *
 * 1. Create a new member account via registration
 * 2. Configure hourly digest frequency and verify acceptance
 * 3. Update to daily digest and confirm the change
 * 4. Configure weekly digest frequency and validate
 * 5. Verify digest mode settings persist correctly across updates
 */
export async function test_api_notification_preferences_digest_mode_configuration(
  connection: api.IConnection,
) {
  // Step 1: Create member account for testing digest mode configuration
  const memberData = {
    username: RandomGenerator.alphaNumeric(10),
    email: typia.random<string & tags.Format<"email">>(),
    password: "SecurePass123!@#",
    display_name: RandomGenerator.name(2),
  } satisfies IDiscussionBoardMember.ICreate;

  const member: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: memberData,
    });
  typia.assert(member);

  // Step 2: Configure hourly digest frequency
  const hourlyDigestUpdate = {
    digest_frequency: "hourly" as const,
  } satisfies IDiscussionBoardMember.INotificationPreferences.IUpdate;

  const hourlyPreferences: IDiscussionBoardMember.INotificationPreferences =
    await api.functional.discussionBoard.member.users.notificationPreferences.update(
      connection,
      {
        userId: member.id,
        body: hourlyDigestUpdate,
      },
    );
  typia.assert(hourlyPreferences);

  TestValidator.equals(
    "hourly digest frequency should be configured",
    hourlyPreferences.digest_frequency,
    "hourly",
  );

  // Step 3: Update to daily digest frequency
  const dailyDigestUpdate = {
    digest_frequency: "daily" as const,
  } satisfies IDiscussionBoardMember.INotificationPreferences.IUpdate;

  const dailyPreferences: IDiscussionBoardMember.INotificationPreferences =
    await api.functional.discussionBoard.member.users.notificationPreferences.update(
      connection,
      {
        userId: member.id,
        body: dailyDigestUpdate,
      },
    );
  typia.assert(dailyPreferences);

  TestValidator.equals(
    "daily digest frequency should be configured",
    dailyPreferences.digest_frequency,
    "daily",
  );

  // Step 4: Configure weekly digest frequency
  const weeklyDigestUpdate = {
    digest_frequency: "weekly" as const,
  } satisfies IDiscussionBoardMember.INotificationPreferences.IUpdate;

  const weeklyPreferences: IDiscussionBoardMember.INotificationPreferences =
    await api.functional.discussionBoard.member.users.notificationPreferences.update(
      connection,
      {
        userId: member.id,
        body: weeklyDigestUpdate,
      },
    );
  typia.assert(weeklyPreferences);

  TestValidator.equals(
    "weekly digest frequency should be configured",
    weeklyPreferences.digest_frequency,
    "weekly",
  );

  // Step 5: Verify realtime mode can be configured
  const realtimeDigestUpdate = {
    digest_frequency: "realtime" as const,
  } satisfies IDiscussionBoardMember.INotificationPreferences.IUpdate;

  const realtimePreferences: IDiscussionBoardMember.INotificationPreferences =
    await api.functional.discussionBoard.member.users.notificationPreferences.update(
      connection,
      {
        userId: member.id,
        body: realtimeDigestUpdate,
      },
    );
  typia.assert(realtimePreferences);

  TestValidator.equals(
    "realtime digest frequency should be configured",
    realtimePreferences.digest_frequency,
    "realtime",
  );

  // Verify the user_id matches the member
  TestValidator.equals(
    "notification preferences user_id should match member id",
    realtimePreferences.user_id,
    member.id,
  );
}
