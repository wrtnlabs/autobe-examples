import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformMemberPreference } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberPreference";

export async function test_api_member_preferences_retrieve_privacy_combinations(
  connection: api.IConnection,
) {
  // Step 1: Create a member account for privacy preference testing
  const memberResponse: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        username: `user_${RandomGenerator.alphaNumeric(6)}`,
        password: `Pass${RandomGenerator.alphaNumeric(6)}!${RandomGenerator.alphaNumeric(2)}`,
        ip: RandomGenerator.mobile(),
        href: "https://example.com/register",
        referrer: "https://example.com",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(memberResponse);

  const memberId = memberResponse.id;

  // Step 2: Define privacy setting combinations to test
  const privacyCombinations = [
    {
      show_profile_publicly: true,
      show_post_history: true,
      show_comment_history: true,
      show_karma_publicly: true,
      show_activity_status: true,
    },
    {
      show_profile_publicly: false,
      show_post_history: false,
      show_comment_history: false,
      show_karma_publicly: false,
      show_activity_status: false,
    },
    {
      show_profile_publicly: true,
      show_post_history: false,
      show_comment_history: true,
      show_karma_publicly: false,
      show_activity_status: true,
    },
    {
      show_profile_publicly: false,
      show_post_history: true,
      show_comment_history: false,
      show_karma_publicly: true,
      show_activity_status: false,
    },
  ];

  // Step 3: Test each privacy combination independently
  for (const combination of privacyCombinations) {
    // Update preferences with current combination
    const updatedPreference: ICommunityPlatformMemberPreference =
      await api.functional.communityPlatform.member.members.preferences.update(
        connection,
        {
          memberId: memberId,
          body: {
            show_profile_publicly: combination.show_profile_publicly,
            show_post_history: combination.show_post_history,
            show_comment_history: combination.show_comment_history,
            show_karma_publicly: combination.show_karma_publicly,
            show_activity_status: combination.show_activity_status,
          } satisfies ICommunityPlatformMemberPreference.IUpdate,
        },
      );
    typia.assert(updatedPreference);

    // Step 4: Retrieve preferences and verify persistence
    const retrievedPreference: ICommunityPlatformMemberPreference =
      await api.functional.communityPlatform.member.members.preferences.at(
        connection,
        {
          memberId: memberId,
        },
      );
    typia.assert(retrievedPreference);

    // Verify all privacy settings are correctly persisted and independent
    TestValidator.equals(
      "profile visibility matches",
      retrievedPreference.show_profile_publicly,
      combination.show_profile_publicly,
    );
    TestValidator.equals(
      "post history visibility matches",
      retrievedPreference.show_post_history,
      combination.show_post_history,
    );
    TestValidator.equals(
      "comment history visibility matches",
      retrievedPreference.show_comment_history,
      combination.show_comment_history,
    );
    TestValidator.equals(
      "karma visibility matches",
      retrievedPreference.show_karma_publicly,
      combination.show_karma_publicly,
    );
    TestValidator.equals(
      "activity status visibility matches",
      retrievedPreference.show_activity_status,
      combination.show_activity_status,
    );
  }

  // Step 5: Final comprehensive test with specific privacy mix
  const finalMixedSettings = {
    show_profile_publicly: true,
    show_post_history: true,
    show_comment_history: false,
    show_karma_publicly: false,
    show_activity_status: true,
  };

  const finalUpdate: ICommunityPlatformMemberPreference =
    await api.functional.communityPlatform.member.members.preferences.update(
      connection,
      {
        memberId: memberId,
        body: {
          show_profile_publicly: finalMixedSettings.show_profile_publicly,
          show_post_history: finalMixedSettings.show_post_history,
          show_comment_history: finalMixedSettings.show_comment_history,
          show_karma_publicly: finalMixedSettings.show_karma_publicly,
          show_activity_status: finalMixedSettings.show_activity_status,
        } satisfies ICommunityPlatformMemberPreference.IUpdate,
      },
    );
  typia.assert(finalUpdate);

  // Step 6: Final retrieval to confirm all settings persisted correctly
  const finalRetrieval: ICommunityPlatformMemberPreference =
    await api.functional.communityPlatform.member.members.preferences.at(
      connection,
      {
        memberId: memberId,
      },
    );
  typia.assert(finalRetrieval);

  // Verify final combination settings are all correctly stored
  TestValidator.equals(
    "final profile visibility setting",
    finalRetrieval.show_profile_publicly,
    finalMixedSettings.show_profile_publicly,
  );
  TestValidator.equals(
    "final post history setting",
    finalRetrieval.show_post_history,
    finalMixedSettings.show_post_history,
  );
  TestValidator.equals(
    "final comment history setting",
    finalRetrieval.show_comment_history,
    finalMixedSettings.show_comment_history,
  );
  TestValidator.equals(
    "final karma visibility setting",
    finalRetrieval.show_karma_publicly,
    finalMixedSettings.show_karma_publicly,
  );
  TestValidator.equals(
    "final activity status setting",
    finalRetrieval.show_activity_status,
    finalMixedSettings.show_activity_status,
  );
}
