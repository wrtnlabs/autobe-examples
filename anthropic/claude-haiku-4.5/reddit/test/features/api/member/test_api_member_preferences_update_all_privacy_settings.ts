import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformMemberPreference } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberPreference";

export async function test_api_member_preferences_update_all_privacy_settings(
  connection: api.IConnection,
) {
  // Step 1: Create a member account through authentication
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberUsername = RandomGenerator.alphabets(8);
  const memberPassword = RandomGenerator.alphaNumeric(12);

  const memberAccount = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      username: memberUsername,
      password: memberPassword,
      ip: "127.0.0.1",
      href: "http://localhost:3000/join",
      referrer: "http://localhost:3000/",
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(memberAccount);

  const memberId = memberAccount.id;

  // Step 2: Update all privacy settings with specific boolean combinations
  const updatePrivacyData = {
    show_profile_publicly: false,
    show_post_history: true,
    show_comment_history: false,
    show_karma_publicly: true,
    show_activity_status: false,
  } satisfies ICommunityPlatformMemberPreference.IUpdate;

  const updatedPreferences =
    await api.functional.communityPlatform.member.members.preferences.update(
      connection,
      {
        memberId: memberId,
        body: updatePrivacyData,
      },
    );
  typia.assert(updatedPreferences);

  // Step 3: Verify response includes all updated privacy values
  TestValidator.equals(
    "show_profile_publicly should be false",
    updatedPreferences.show_profile_publicly,
    false,
  );
  TestValidator.equals(
    "show_post_history should be true",
    updatedPreferences.show_post_history,
    true,
  );
  TestValidator.equals(
    "show_comment_history should be false",
    updatedPreferences.show_comment_history,
    false,
  );
  TestValidator.equals(
    "show_karma_publicly should be true",
    updatedPreferences.show_karma_publicly,
    true,
  );
  TestValidator.equals(
    "show_activity_status should be false",
    updatedPreferences.show_activity_status,
    false,
  );

  // Step 4: Confirm all privacy changes persisted by updating again with different values
  const secondUpdateData = {
    show_profile_publicly: true,
    show_post_history: false,
    show_comment_history: true,
    show_karma_publicly: false,
    show_activity_status: true,
  } satisfies ICommunityPlatformMemberPreference.IUpdate;

  const secondUpdate =
    await api.functional.communityPlatform.member.members.preferences.update(
      connection,
      {
        memberId: memberId,
        body: secondUpdateData,
      },
    );
  typia.assert(secondUpdate);

  // Step 5: Verify the second update also applied correctly, confirming persistence
  TestValidator.equals(
    "second update - show_profile_publicly should be true",
    secondUpdate.show_profile_publicly,
    true,
  );
  TestValidator.equals(
    "second update - show_post_history should be false",
    secondUpdate.show_post_history,
    false,
  );
  TestValidator.equals(
    "second update - show_comment_history should be true",
    secondUpdate.show_comment_history,
    true,
  );
  TestValidator.equals(
    "second update - show_karma_publicly should be false",
    secondUpdate.show_karma_publicly,
    false,
  );
  TestValidator.equals(
    "second update - show_activity_status should be true",
    secondUpdate.show_activity_status,
    true,
  );
}
