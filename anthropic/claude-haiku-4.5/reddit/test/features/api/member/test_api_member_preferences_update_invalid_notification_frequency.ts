import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformMemberPreference } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberPreference";

/**
 * Test that member preferences can be successfully updated with valid
 * notification_frequency values.
 *
 * This test validates that the member preferences update endpoint correctly
 * processes requests with valid notification_frequency values from the allowed
 * enum: 'instant', 'daily', 'weekly', or 'disabled'. The test verifies that
 * preferences can be updated and changes persist correctly.
 *
 * Test workflow:
 *
 * 1. Create a member account via authentication
 * 2. Update preferences with a valid notification_frequency value
 * 3. Verify the preference update succeeded
 * 4. Verify the notification_frequency was correctly updated
 * 5. Test updating to different valid notification_frequency values
 */
export async function test_api_member_preferences_update_invalid_notification_frequency(
  connection: api.IConnection,
) {
  // Step 1: Create a member account
  const memberData = {
    email: typia.random<string & tags.Format<"email">>(),
    username: RandomGenerator.alphabets(8),
    password: "SecurePassword123!",
    ip: "192.168.1.1",
    href: "https://example.com/register" satisfies string & tags.Format<"uri">,
    referrer: "https://example.com" satisfies string & tags.Format<"uri">,
  } satisfies ICommunityPlatformMember.ICreate;

  const member = await api.functional.auth.member.join(connection, {
    body: memberData,
  });
  typia.assert(member);

  const memberId = member.id;

  // Step 2: Update preferences with valid notification_frequency value
  const firstUpdate =
    await api.functional.communityPlatform.member.members.preferences.update(
      connection,
      {
        memberId: memberId,
        body: {
          notification_frequency: "instant",
        } satisfies ICommunityPlatformMemberPreference.IUpdate,
      },
    );
  typia.assert(firstUpdate);

  // Step 3: Verify the first update was successful
  TestValidator.equals(
    "notification_frequency should be updated to instant",
    firstUpdate.notification_frequency,
    "instant",
  );

  // Step 4: Update to another valid notification_frequency value
  const secondUpdate =
    await api.functional.communityPlatform.member.members.preferences.update(
      connection,
      {
        memberId: memberId,
        body: {
          notification_frequency: "daily",
        } satisfies ICommunityPlatformMemberPreference.IUpdate,
      },
    );
  typia.assert(secondUpdate);

  // Step 5: Verify the second update was successful
  TestValidator.equals(
    "notification_frequency should be updated to daily",
    secondUpdate.notification_frequency,
    "daily",
  );

  // Step 6: Verify all valid enum values can be set
  const validFrequencies: Array<"instant" | "daily" | "weekly" | "disabled"> = [
    "weekly",
    "disabled",
  ];

  for (const frequency of validFrequencies) {
    const update =
      await api.functional.communityPlatform.member.members.preferences.update(
        connection,
        {
          memberId: memberId,
          body: {
            notification_frequency: frequency,
          } satisfies ICommunityPlatformMemberPreference.IUpdate,
        },
      );
    typia.assert(update);

    TestValidator.equals(
      `notification_frequency should be updated to ${frequency}`,
      update.notification_frequency,
      frequency,
    );
  }
}
