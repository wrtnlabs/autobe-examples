import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformPrivacySettings } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPrivacySettings";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";

/**
 * Validates that a newly registered user can create their initial privacy
 * settings record and that the API enforces uniqueness (one record per user).
 *
 * Business context: All new users must set initial privacy preferences
 * post-registration. Platform must enforce 1:1 mapping and block duplicate
 * creation. Audit fields are not accepted in requests.
 *
 * Steps:
 *
 * 1. Register new user (join)
 * 2. Create privacy settings with valid values for all fields
 * 3. Confirm all persisted values match those initially sent; system-managed
 *    fields are present only in the response
 * 4. Validate user association by matching user.id with
 *    privacySettings.community_platform_user_id
 * 5. Attempt duplicate privacy settings creation for same user, expect error
 *    (uniqueness constraint enforced)
 */
export async function test_api_privacy_settings_creation_new_user(
  connection: api.IConnection,
) {
  // 1. Register a new user (obtain authentication context)
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = typia.random<string & tags.Format<"password">>();
  const userAuthorized: ICommunityPlatformUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: {
        email: userEmail,
        password: userPassword,
      } satisfies ICommunityPlatformUser.IJoin,
    });
  typia.assert(userAuthorized);

  // 2. Create privacy settings for this user, store sent input for comparison
  const privacyInput = {
    profile_visibility: RandomGenerator.pick([
      "public",
      "private",
      "follower_only",
    ] as const),
    search_discoverable: RandomGenerator.pick([true, false] as const),
    data_processing_consent: true, // required to enable platform use
    data_export_enabled: RandomGenerator.pick([true, false] as const),
  } satisfies ICommunityPlatformPrivacySettings.ICreate;
  const privacySettings: ICommunityPlatformPrivacySettings =
    await api.functional.communityPlatform.user.privacySettings.create(
      connection,
      {
        body: privacyInput,
      },
    );
  typia.assert(privacySettings);

  // 3. Confirm all persisted values match what was sent, system-managed fields are only present in response
  TestValidator.equals(
    "privacy setting - profile_visibility",
    privacySettings.profile_visibility,
    privacyInput.profile_visibility,
  );
  TestValidator.equals(
    "privacy setting - search_discoverable",
    privacySettings.search_discoverable,
    privacyInput.search_discoverable,
  );
  TestValidator.equals(
    "privacy setting - data_processing_consent",
    privacySettings.data_processing_consent,
    privacyInput.data_processing_consent,
  );
  TestValidator.equals(
    "privacy setting - data_export_enabled",
    privacySettings.data_export_enabled,
    privacyInput.data_export_enabled,
  );
  TestValidator.equals(
    "privacy setting user association",
    privacySettings.community_platform_user_id,
    userAuthorized.id,
  );

  // 4. Attempt to create duplicate privacy settings for the same user and expect error
  await TestValidator.error(
    "duplicate privacy settings creation for same user is rejected",
    async () => {
      await api.functional.communityPlatform.user.privacySettings.create(
        connection,
        {
          body: privacyInput,
        },
      );
    },
  );
}
