import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformPrivacySettings } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPrivacySettings";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";

/**
 * Validates privacy settings update for an authenticated user.
 *
 * 1. Register a new user (UserA) and authenticate.
 * 2. Create initial privacy settings for UserA with random valid values.
 * 3. Update privacy settings for UserA with a new set of valid options covering
 *    all updatable fields.
 * 4. Assert that the update is correctly reflected (all fields match new values)
 *    and that system-managed fields
 *    (created_at/updated_at/deleted_at/community_platform_user_id/id) have not
 *    been manipulated.
 * 5. Register another user (UserB) and authenticate as UserB.
 * 6. Attempt to update UserA's privacy settings as UserB and assert this fails
 *    (authorization enforced).
 * 7. Confirm via code and comments: attempts to include system-managed audit
 *    fields in the update body are compile-time errors—clients cannot override
 *    these fields due to DTO typing.
 */
export async function test_api_privacy_settings_update_existing_user(
  connection: api.IConnection,
) {
  // 1. Register UserA and authenticate
  const userAEmail = typia.random<string & tags.Format<"email">>();
  const userA = await api.functional.auth.user.join(connection, {
    body: {
      email: userAEmail,
      password: "securePassword123!",
    } satisfies ICommunityPlatformUser.IJoin,
  });
  typia.assert(userA);

  // 2. Create privacy settings for UserA
  const initialSettingsBody = {
    profile_visibility: RandomGenerator.pick([
      "public",
      "private",
      "follower_only",
    ] as const),
    search_discoverable: true,
    data_processing_consent: true,
    data_export_enabled: false,
  } satisfies ICommunityPlatformPrivacySettings.ICreate;
  const initialSettings =
    await api.functional.communityPlatform.user.privacySettings.create(
      connection,
      { body: initialSettingsBody },
    );
  typia.assert(initialSettings);

  // 3. Update privacy settings
  const updateBody = {
    profile_visibility: RandomGenerator.pick([
      "public",
      "private",
      "follower_only",
    ] as const),
    search_discoverable: false,
    data_processing_consent: false,
    data_export_enabled: true,
  } satisfies ICommunityPlatformPrivacySettings.IUpdate;
  const updatedSettings =
    await api.functional.communityPlatform.user.privacySettings.update(
      connection,
      {
        privacySettingsId: initialSettings.id,
        body: updateBody,
      },
    );
  typia.assert(updatedSettings);
  // 4. Assert all updatable fields reflect new values, audit fields are preserved
  TestValidator.equals(
    "profile_visibility was updated",
    updatedSettings.profile_visibility,
    updateBody.profile_visibility,
  );
  TestValidator.equals(
    "search_discoverable was updated",
    updatedSettings.search_discoverable,
    updateBody.search_discoverable,
  );
  TestValidator.equals(
    "data_processing_consent was updated",
    updatedSettings.data_processing_consent,
    updateBody.data_processing_consent,
  );
  TestValidator.equals(
    "data_export_enabled was updated",
    updatedSettings.data_export_enabled,
    updateBody.data_export_enabled,
  );
  // Audit fields should not be changed by client update
  TestValidator.equals(
    "user id did not change",
    updatedSettings.community_platform_user_id,
    userA.id,
  );
  TestValidator.equals(
    "privacySettingsId is stable",
    updatedSettings.id,
    initialSettings.id,
  );
  TestValidator.equals(
    "created_at is stable",
    updatedSettings.created_at,
    initialSettings.created_at,
  );
  TestValidator.notEquals(
    "updated_at has changed",
    updatedSettings.updated_at,
    initialSettings.updated_at,
  );
  // Assert updated_at is greater than or equal w.r.t. ISO timestamp ordering
  TestValidator.predicate(
    "updated_at is later than initial updated_at",
    updatedSettings.updated_at > initialSettings.updated_at,
  );
  TestValidator.equals(
    "deleted_at is unchanged",
    updatedSettings.deleted_at ?? null,
    initialSettings.deleted_at ?? null,
  );

  // 5. Register UserB and authenticate as UserB
  const userBEmail = typia.random<string & tags.Format<"email">>();
  const userB = await api.functional.auth.user.join(connection, {
    body: {
      email: userBEmail,
      password: "anotherStrongP@ssw0rd!",
    } satisfies ICommunityPlatformUser.IJoin,
  });
  typia.assert(userB);

  // Switch to UserB (their Authorization header will be set by SDK)
  // 6. UserB attempts to update UserA's privacy settings - authorization should fail
  await TestValidator.error(
    "unauthorized user cannot update another's privacy settings",
    async () => {
      await api.functional.communityPlatform.user.privacySettings.update(
        connection,
        {
          privacySettingsId: initialSettings.id,
          body: {
            profile_visibility: "public",
          },
        },
      );
    },
  );

  // 7. System-managed fields (created_at, updated_at, id, community_platform_user_id, deleted_at)
  // cannot be set via ICommunityPlatformPrivacySettings.IUpdate.
  // The client cannot construct an update body including these fields because DTO typing prohibits it.
  // Therefore, it is not possible to submit a request attempting to update these fields; compile-time typing enforces this privacy and audit policy.
}
