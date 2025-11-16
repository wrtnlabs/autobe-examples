import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformAdministratorProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministratorProfile";

/**
 * Validate that an authenticated administrator can update their own platform
 * administrator profile fields and handle error cases.
 *
 * Steps:
 *
 * 1. Register a new administrator (admin1), which creates an administrator profile
 *    by default. Capture IDs and token.
 * 2. Prepare valid profile update input:
 *
 *    - Change display_username (new value, unique)
 *    - Set/update avatar_uri (random uri)
 *    - Set/update bio (random paragraph)
 *    - Change status (e.g., public -> hidden)
 * 3. Call the profile update API as the authenticated admin. Validate:
 *
 *    - The returned profile reflects all new field values
 *    - Updated_at timestamp is updated (differs from before)
 * 4. Register a second administrator (admin2) to create a conflicting
 *    display_username.
 * 5. Attempt to update admin1's profile to use admin2's display_username. Validate
 *    error (unique constraint).
 * 6. Attempt to update a non-existent profile (random UUID). Validate error (not
 *    found/invalid reference).
 * 7. (Optional) If soft delete is supported, simulate soft-deletion and confirm
 *    updates are rejected.
 */
export async function test_api_administrator_profile_update_by_administrator(
  connection: api.IConnection,
) {
  // 1. Register admin1 (main test subject)
  const admin1_email = typia.random<string & tags.Format<"email">>();
  const admin1_password = typia.random<string & tags.Format<"password">>();
  const admin1 = await api.functional.auth.administrator.join(connection, {
    body: { email: admin1_email, password: admin1_password },
  });
  typia.assert(admin1);
  const admin1_id = admin1.id;
  const updated_at_before = admin1.updated_at;

  // 2. Prepare valid profile update
  const new_display_username = RandomGenerator.name();
  const new_avatar_uri = typia.random<string & tags.Format<"uri">>();
  const new_bio = RandomGenerator.paragraph();
  const new_status = RandomGenerator.pick([
    "public",
    "hidden",
    "retired",
  ] as const);

  // 3. Update profile
  const update_body = {
    display_username: new_display_username,
    avatar_uri: new_avatar_uri,
    bio: new_bio,
    status: new_status,
  } satisfies ICommunityPlatformAdministratorProfile.IUpdate;
  const updated_profile =
    await api.functional.communityPlatform.administrator.administrators.profiles.update(
      connection,
      { administratorId: admin1_id, profileId: admin1_id, body: update_body },
    );
  typia.assert(updated_profile);
  TestValidator.equals(
    "profile username updated",
    updated_profile.display_username,
    new_display_username,
  );
  TestValidator.equals(
    "profile avatar updated",
    updated_profile.avatar_uri,
    new_avatar_uri,
  );
  TestValidator.equals("profile bio updated", updated_profile.bio, new_bio);
  TestValidator.equals(
    "profile status updated",
    updated_profile.status,
    new_status,
  );
  TestValidator.notEquals(
    "updated_at changed",
    updated_profile.updated_at,
    updated_at_before,
  );

  // 4. Register admin2 (for uniqueness conflict)
  const admin2_email = typia.random<string & tags.Format<"email">>();
  const admin2_password = typia.random<string & tags.Format<"password">>();
  const admin2 = await api.functional.auth.administrator.join(connection, {
    body: { email: admin2_email, password: admin2_password },
  });
  typia.assert(admin2);
  const duplicate_username = updated_profile.display_username;

  // 5. Uniqueness violation
  await TestValidator.error("conflicting display_username fails", async () => {
    await api.functional.communityPlatform.administrator.administrators.profiles.update(
      connection,
      {
        administratorId: admin2.id,
        profileId: admin2.id,
        body: {
          display_username: duplicate_username,
        } satisfies ICommunityPlatformAdministratorProfile.IUpdate,
      },
    );
  });

  // 6. Non-existent profile update
  const nonExistUuid = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error("updating non-existent profile fails", async () => {
    await api.functional.communityPlatform.administrator.administrators.profiles.update(
      connection,
      {
        administratorId: nonExistUuid,
        profileId: nonExistUuid,
        body: update_body,
      },
    );
  });
}
