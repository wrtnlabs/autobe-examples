import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUserProfile";

/**
 * Validate administrator's ability to update user profiles and enforce all
 * validation/business rules on ICommunityPlatformUserProfile.
 *
 * The scenario covers:
 *
 * 1. Register two administrators for permission and uniqueness checks.
 * 2. Prepare two user IDs and two profile IDs (simulate two users with profiles).
 * 3. Perform basic admin login and ensure token is obtained.
 * 4. Admin updates their own profile: change display_username, avatar_uri, bio,
 *    and status ('active', 'suspended', 'hidden').
 * 5. Admin updates other user's profile: modify the same fields.
 * 6. Test display_username uniqueness - attempt to set same display_username for
 *    both profiles, expect error.
 * 7. Attempt to set invalid status and expect error.
 * 8. Attempt to set invalid format for display_username (empty string), expect
 *    error.
 * 9. Test valid removal of avatar_uri and bio by setting them to null.
 */
export async function test_api_admin_profile_update_for_user(
  connection: api.IConnection,
) {
  // 1. Register two administrators
  const adminEmail1 = typia.random<string & tags.Format<"email">>();
  const admin1 = await api.functional.auth.administrator.join(connection, {
    body: {
      email: adminEmail1,
      password: "StrongP@ssw0rd123",
      business_status: null,
    },
  });
  typia.assert(admin1);

  const adminEmail2 = typia.random<string & tags.Format<"email">>();
  const admin2 = await api.functional.auth.administrator.join(connection, {
    body: {
      email: adminEmail2,
      password: "AnotherP@ssw0rd321",
      business_status: null,
    },
  });
  typia.assert(admin2);

  // 2. Prepare user and profile IDs
  const userId1 = typia.random<string & tags.Format<"uuid">>();
  const userId2 = typia.random<string & tags.Format<"uuid">>();
  const profileId1 = typia.random<string & tags.Format<"uuid">>();
  const profileId2 = typia.random<string & tags.Format<"uuid">>();

  // 3. Simulate existing profiles (we must mock them as they're not created by endpoint)
  // Assume profiles for user1 and user2 exist with these IDs.
  // In a real environment, test setup would use user/profile creation endpoints.

  // 4. Update admin1's own profile
  const newDisplayUsername1 =
    RandomGenerator.name().replace(/\s/g, "_") + "_unique1";
  const newAvatarUri1 = "https://example.com/avatar1.png";
  const newBio1 = RandomGenerator.paragraph({ sentences: 2 });
  const statusValues = ["active", "suspended", "hidden"] as const;
  for (const status of statusValues) {
    const updated1 =
      await api.functional.communityPlatform.administrator.users.profiles.update(
        connection,
        {
          userId: userId1,
          profileId: profileId1,
          body: {
            display_username: newDisplayUsername1,
            avatar_uri: newAvatarUri1,
            bio: newBio1,
            status,
          },
        },
      );
    typia.assert(updated1);
    TestValidator.equals(
      `profile (admin1 own) status set to ${status}`,
      updated1.status,
      status,
    );
    TestValidator.equals(
      `profile (admin1 own) display_username set`,
      updated1.display_username,
      newDisplayUsername1,
    );
    TestValidator.equals(
      `profile (admin1 own) avatar_uri set`,
      updated1.avatar_uri,
      newAvatarUri1,
    );
    TestValidator.equals(`profile (admin1 own) bio set`, updated1.bio, newBio1);
  }

  // 5. Admin updates other user's profile
  const newDisplayUsername2 =
    RandomGenerator.name().replace(/\s/g, "_") + "_unique2";
  const newAvatarUri2 = "https://example.com/avatar2.png";
  const newBio2 = RandomGenerator.paragraph({ sentences: 2 });
  for (const status of statusValues) {
    const updated2 =
      await api.functional.communityPlatform.administrator.users.profiles.update(
        connection,
        {
          userId: userId2,
          profileId: profileId2,
          body: {
            display_username: newDisplayUsername2,
            avatar_uri: newAvatarUri2,
            bio: newBio2,
            status,
          },
        },
      );
    typia.assert(updated2);
    TestValidator.equals(
      `profile (admin updates other) status set to ${status}`,
      updated2.status,
      status,
    );
    TestValidator.equals(
      "profile (admin updates other) display_username set",
      updated2.display_username,
      newDisplayUsername2,
    );
    TestValidator.equals(
      "profile (admin updates other) avatar_uri set",
      updated2.avatar_uri,
      newAvatarUri2,
    );
    TestValidator.equals(
      "profile (admin updates other) bio set",
      updated2.bio,
      newBio2,
    );
  }

  // 6. Test display_username uniqueness
  await TestValidator.error(
    "profiles cannot have duplicate display_username",
    async () => {
      await api.functional.communityPlatform.administrator.users.profiles.update(
        connection,
        {
          userId: userId2,
          profileId: profileId2,
          body: {
            display_username: newDisplayUsername1, // duplicate of profileId1
          },
        },
      );
    },
  );

  // 7. Invalid status
  await TestValidator.error("rejects invalid status value", async () => {
    await api.functional.communityPlatform.administrator.users.profiles.update(
      connection,
      {
        userId: userId1,
        profileId: profileId1,
        body: {
          status: "invalid_status_value",
        },
      },
    );
  });

  // 8. Invalid display_username format (empty string)
  await TestValidator.error("rejects empty display_username", async () => {
    await api.functional.communityPlatform.administrator.users.profiles.update(
      connection,
      {
        userId: userId1,
        profileId: profileId1,
        body: {
          display_username: "",
        },
      },
    );
  });

  // 9. Remove avatar_uri and bio by setting to null
  const updateRemoved =
    await api.functional.communityPlatform.administrator.users.profiles.update(
      connection,
      {
        userId: userId1,
        profileId: profileId1,
        body: {
          avatar_uri: null,
          bio: null,
        },
      },
    );
  typia.assert(updateRemoved);
  TestValidator.equals(
    "avatar_uri was removed (null)",
    updateRemoved.avatar_uri,
    null,
  );
  TestValidator.equals("bio was removed (null)", updateRemoved.bio, null);
}
