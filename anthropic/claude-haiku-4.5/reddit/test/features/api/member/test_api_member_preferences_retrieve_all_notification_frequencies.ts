import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformMemberPreference } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberPreference";

/**
 * Test that preferences can be retrieved correctly for all
 * notification_frequency enum values.
 *
 * This test validates the complete preference retrieval workflow across all
 * supported notification frequency options. It performs the following steps:
 *
 * 1. Create four separate member accounts
 * 2. Set each member's notification_frequency to a different valid enum value
 * 3. Retrieve preferences for each member
 * 4. Validate that the correct frequency is stored and returned
 *
 * This ensures all enum values ('instant', 'daily', 'weekly', 'disabled') work
 * correctly in preference storage and retrieval operations.
 */
export async function test_api_member_preferences_retrieve_all_notification_frequencies(
  connection: api.IConnection,
) {
  // Test data: all valid notification_frequency enum values
  const frequencies: Array<"instant" | "daily" | "weekly" | "disabled"> = [
    "instant",
    "daily",
    "weekly",
    "disabled",
  ];

  // Test each notification frequency enum value
  for (const frequency of frequencies) {
    // Step 1: Create a new member account
    const memberCreate = {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.alphabets(8),
      password: "TestPassword123!",
      ip: undefined,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ICommunityPlatformMember.ICreate;

    const member = await api.functional.auth.member.join(connection, {
      body: memberCreate,
    });
    typia.assert(member);

    // Step 2: Update preferences to set notification_frequency
    const updatePreferences = {
      notification_frequency: frequency,
    } satisfies ICommunityPlatformMemberPreference.IUpdate;

    const updatedPref =
      await api.functional.communityPlatform.member.members.preferences.update(
        connection,
        {
          memberId: member.id,
          body: updatePreferences,
        },
      );
    typia.assert(updatedPref);

    // Validate that the update stored the correct frequency
    TestValidator.equals(
      `notification frequency should be ${frequency} after update`,
      updatedPref.notification_frequency,
      frequency,
    );

    // Step 3: Retrieve preferences for this member
    const retrievedPref =
      await api.functional.communityPlatform.member.members.preferences.at(
        connection,
        {
          memberId: member.id,
        },
      );
    typia.assert(retrievedPref);

    // Step 4: Validate the retrieved frequency matches what was set
    TestValidator.equals(
      `retrieved notification frequency should be ${frequency}`,
      retrievedPref.notification_frequency,
      frequency,
    );

    // Additional validation: verify the member ID is correct
    TestValidator.equals(
      `preference member ID should match`,
      retrievedPref.community_platform_member_id,
      member.id,
    );
  }
}
