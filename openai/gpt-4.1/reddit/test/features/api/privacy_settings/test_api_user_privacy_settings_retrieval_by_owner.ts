import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformPrivacySettings } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPrivacySettings";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";

/**
 * Test that a user can create and subsequently retrieve their own privacy
 * settings record by its unique identifier.
 *
 * Steps:
 *
 * 1. Register a new user
 * 2. Create privacy settings for that user
 * 3. Retrieve privacy settings using the generated ID
 * 4. Assert full field equality and correct values
 *
 * Validates end-user can access their own privacy settings and that values are
 * consistent.
 */
export async function test_api_user_privacy_settings_retrieval_by_owner(
  connection: api.IConnection,
) {
  // 1. Register a new user
  const userEmail: string = typia.random<string & tags.Format<"email">>();
  const password: string = typia.random<string & tags.Format<"password">>();
  const user: ICommunityPlatformUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: {
        email: userEmail,
        password: password,
      } satisfies ICommunityPlatformUser.IJoin,
    });
  typia.assert(user);

  // 2. Create privacy settings for this user
  const createSettingsBody = {
    profile_visibility: RandomGenerator.pick([
      "public",
      "private",
      "follower_only",
    ] as const),
    search_discoverable: Math.random() > 0.5,
    data_processing_consent: Math.random() > 0.5,
    data_export_enabled: Math.random() > 0.5,
  } satisfies ICommunityPlatformPrivacySettings.ICreate;
  const createdSettings: ICommunityPlatformPrivacySettings =
    await api.functional.communityPlatform.user.privacySettings.create(
      connection,
      { body: createSettingsBody },
    );
  typia.assert(createdSettings);
  TestValidator.equals(
    "privacy settings profile_visibility matches",
    createdSettings.profile_visibility,
    createSettingsBody.profile_visibility,
  );
  TestValidator.equals(
    "privacy settings search_discoverable matches",
    createdSettings.search_discoverable,
    createSettingsBody.search_discoverable,
  );
  TestValidator.equals(
    "privacy settings data_processing_consent matches",
    createdSettings.data_processing_consent,
    createSettingsBody.data_processing_consent,
  );
  TestValidator.equals(
    "privacy settings data_export_enabled matches",
    createdSettings.data_export_enabled,
    createSettingsBody.data_export_enabled,
  );

  // 3. Retrieve settings by id
  const retrievedSettings: ICommunityPlatformPrivacySettings =
    await api.functional.communityPlatform.user.privacySettings.at(connection, {
      privacySettingsId: createdSettings.id,
    });
  typia.assert(retrievedSettings);

  // 4. Validate all privacy fields and user association
  TestValidator.equals(
    "retrieved settings id matches created",
    retrievedSettings.id,
    createdSettings.id,
  );
  TestValidator.equals(
    "retrieved settings profile_visibility matches",
    retrievedSettings.profile_visibility,
    createSettingsBody.profile_visibility,
  );
  TestValidator.equals(
    "retrieved settings search_discoverable matches",
    retrievedSettings.search_discoverable,
    createSettingsBody.search_discoverable,
  );
  TestValidator.equals(
    "retrieved settings data_processing_consent matches",
    retrievedSettings.data_processing_consent,
    createSettingsBody.data_processing_consent,
  );
  TestValidator.equals(
    "retrieved settings data_export_enabled matches",
    retrievedSettings.data_export_enabled,
    createSettingsBody.data_export_enabled,
  );
  TestValidator.equals(
    "retrieved settings owned by user",
    retrievedSettings.community_platform_user_id,
    user.id,
  );
}
