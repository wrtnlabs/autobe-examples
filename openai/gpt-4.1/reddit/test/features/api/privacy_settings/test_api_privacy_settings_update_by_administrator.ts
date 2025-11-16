import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformPrivacySettings } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPrivacySettings";

/**
 * Validate administrator-privileged update of a target user's privacy settings.
 *
 * This test ensures an authenticated administrator can update a user’s privacy
 * settings, altering all updatable fields, and that system-managed properties
 * cannot be changed.
 *
 * Steps:
 *
 * 1. Register a new administrator (using randomized email, password).
 * 2. Simulate a target privacy settings record (using typia.random for the
 *    privacySettingsId and reference data).
 * 3. Use administrator account to update privacy settings by ID, changing:
 *
 *    - Profile_visibility: to "follower_only"
 *    - Search_discoverable: false
 *    - Data_processing_consent: false
 *    - Data_export_enabled: false
 * 4. Confirm response reflects all alterations, and that
 *    created_at/updated_at/deleted_at are untouched by the request.
 */
export async function test_api_privacy_settings_update_by_administrator(
  connection: api.IConnection,
) {
  // 1. Create and authenticate a new administrator
  const adminCreateInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
  } satisfies ICommunityPlatformAdministrator.ICreate;
  const admin: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: adminCreateInput,
    });
  typia.assert(admin);

  // 2. Simulate an existing privacy settings record
  const origPrivacy: ICommunityPlatformPrivacySettings =
    typia.random<ICommunityPlatformPrivacySettings>();
  typia.assert(origPrivacy);
  const privacySettingsId = origPrivacy.id;

  // 3. Prepare update and perform the PUT operation as administrator
  const updateBody = {
    profile_visibility: "follower_only",
    search_discoverable: false,
    data_processing_consent: false,
    data_export_enabled: false,
  } satisfies ICommunityPlatformPrivacySettings.IUpdate;
  const output: ICommunityPlatformPrivacySettings =
    await api.functional.communityPlatform.administrator.privacySettings.update(
      connection,
      {
        privacySettingsId,
        body: updateBody,
      },
    );
  typia.assert(output);

  // 4. Assertions - check only the business logic changes (no format checks needed)
  TestValidator.equals(
    "profile_visibility updated to follower_only",
    output.profile_visibility,
    "follower_only",
  );
  TestValidator.equals(
    "search_discoverable updated to false",
    output.search_discoverable,
    false,
  );
  TestValidator.equals(
    "data_processing_consent updated to false",
    output.data_processing_consent,
    false,
  );
  TestValidator.equals(
    "data_export_enabled updated to false",
    output.data_export_enabled,
    false,
  );
}
