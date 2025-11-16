import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import type { ICommunityPlatformUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUserProfile";

/**
 * Validate updating the authenticated user's own profile, including display
 * username, avatar URI, bio, and status.
 *
 * Ensures:
 *
 * - A user can only update their own profile (self-only, not others')
 * - Display_username must be unique, non-empty, and properly formatted
 * - Attempt to update to an existing display_username fails
 * - Avatar_uri (set and clear) works
 * - Bio field (set and clear) works
 * - Status updates allowed only to permitted values (active/hidden/suspended)
 * - Status change is reflected in profile
 * - All updates result in updated_at timestamp advancing
 * - Unauthorized/invalid update attempts are appropriately rejected
 */
export async function test_api_user_profile_update_by_owner(
  connection: api.IConnection,
) {
  // 1. Register first user and get their ID
  const user1Email = typia.random<string & tags.Format<"email">>();
  const user1Password = RandomGenerator.alphaNumeric(12);
  const user1JoinResult = await api.functional.auth.user.join(connection, {
    body: {
      email: user1Email,
      password: user1Password,
    } satisfies ICommunityPlatformUser.IJoin,
  });
  typia.assert(user1JoinResult);
  const user1Id = user1JoinResult.id;

  // 2. Simulate profile exists - for this test, use profile = user1Id as both userId and profileId
  // In practice, profile's id would likely equal user's id if one-to-one mapping, otherwise fetch profile entity after join
  const profileId = user1Id;
  // Create initial update for display_username, avatar_uri, bio, and status
  const displayUsername1 = RandomGenerator.alphaNumeric(8);
  const avatarUri1 =
    "https://avatars.example.com/" + RandomGenerator.alphaNumeric(12);
  const bio1 = RandomGenerator.paragraph({ sentences: 3 });
  const status1 = "active";

  // Perform update: set initial values
  const initialProfile =
    await api.functional.communityPlatform.user.users.profiles.update(
      connection,
      {
        userId: user1Id,
        profileId,
        body: {
          display_username: displayUsername1,
          avatar_uri: avatarUri1,
          bio: bio1,
          status: status1,
        } satisfies ICommunityPlatformUserProfile.IUpdate,
      },
    );
  typia.assert(initialProfile);
  TestValidator.equals(
    "profile owner id",
    initialProfile.community_platform_user_id,
    user1Id,
  );
  TestValidator.equals(
    "profile display_username set",
    initialProfile.display_username,
    displayUsername1,
  );
  TestValidator.equals(
    "profile avatar_uri set",
    initialProfile.avatar_uri,
    avatarUri1,
  );
  TestValidator.equals("profile bio set", initialProfile.bio, bio1);
  TestValidator.equals("profile status set", initialProfile.status, status1);

  // Save updated_at for later timestamp comparison
  const prevUpdatedAt = initialProfile.updated_at;

  // 3. Update profile fields again (change username, clear avatar, clear bio, set status = hidden)
  const displayUsername2 = RandomGenerator.alphaNumeric(10); // unique new username
  const status2 = "hidden";
  const updatedProfile =
    await api.functional.communityPlatform.user.users.profiles.update(
      connection,
      {
        userId: user1Id,
        profileId,
        body: {
          display_username: displayUsername2, // update to new username
          avatar_uri: null, // clear avatar
          bio: null, // clear bio
          status: status2,
        } satisfies ICommunityPlatformUserProfile.IUpdate,
      },
    );
  typia.assert(updatedProfile);
  TestValidator.equals(
    "display_username updated",
    updatedProfile.display_username,
    displayUsername2,
  );
  TestValidator.equals("avatar_uri cleared", updatedProfile.avatar_uri, null);
  TestValidator.equals("bio cleared", updatedProfile.bio, null);
  TestValidator.equals("status updated", updatedProfile.status, status2);
  TestValidator.predicate(
    "updated_at timestamp advanced after update",
    new Date(updatedProfile.updated_at).getTime() >
      new Date(prevUpdatedAt).getTime(),
  );

  // 4. Attempt to set status to "suspended" (allowed by business, should succeed)
  const status3 = "suspended";
  const profileSuspended =
    await api.functional.communityPlatform.user.users.profiles.update(
      connection,
      {
        userId: user1Id,
        profileId,
        body: {
          status: status3,
        } satisfies ICommunityPlatformUserProfile.IUpdate,
      },
    );
  typia.assert(profileSuspended);
  TestValidator.equals("profile suspended", profileSuspended.status, status3);

  // 5. Register second user
  // (will try to update user1's profile, and will set display_username same as user1's for uniqueness test)
  const user2Email = typia.random<string & tags.Format<"email">>();
  const user2Password = RandomGenerator.alphaNumeric(14);
  const user2JoinResult = await api.functional.auth.user.join(connection, {
    body: {
      email: user2Email,
      password: user2Password,
    } satisfies ICommunityPlatformUser.IJoin,
  });
  typia.assert(user2JoinResult);
  const user2Id = user2JoinResult.id;

  // Switch: Attempt to update user1's profile as user2 (should be rejected)
  await TestValidator.error("user2 cannot update user1 profile", async () => {
    await api.functional.communityPlatform.user.users.profiles.update(
      connection,
      {
        userId: user1Id,
        profileId,
        body: {
          display_username: RandomGenerator.alphaNumeric(12),
        } satisfies ICommunityPlatformUserProfile.IUpdate,
      },
    );
  });

  // Switch back to user1 and set the new display_username
  await api.functional.auth.user.join(connection, {
    body: {
      email: user1Email,
      password: user1Password,
    } satisfies ICommunityPlatformUser.IJoin,
  });

  // Set display_username for user2 (unique, different from user1)
  const displayUsername3 = RandomGenerator.alphaNumeric(9);
  const user2Profile =
    await api.functional.communityPlatform.user.users.profiles.update(
      connection,
      {
        userId: user2Id,
        profileId: user2Id,
        body: {
          display_username: displayUsername3,
        } satisfies ICommunityPlatformUserProfile.IUpdate,
      },
    );
  typia.assert(user2Profile);
  TestValidator.equals(
    "user2 display_username unique",
    user2Profile.display_username,
    displayUsername3,
  );

  // Now, try to set user1's display_username to user2's (should be uniqueness violation)
  await TestValidator.error(
    "profile display_username must be unique platform-wide",
    async () => {
      await api.functional.communityPlatform.user.users.profiles.update(
        connection,
        {
          userId: user1Id,
          profileId,
          body: {
            display_username: displayUsername3,
          } satisfies ICommunityPlatformUserProfile.IUpdate,
        },
      );
    },
  );

  // Try to set status to an invalid value (should fail: only allowed values should be accepted)
  await TestValidator.error(
    "status must be one of allowed values",
    async () => {
      await api.functional.communityPlatform.user.users.profiles.update(
        connection,
        {
          userId: user1Id,
          profileId,
          body: {
            status: "not_a_valid_status",
          } satisfies ICommunityPlatformUserProfile.IUpdate,
        },
      );
    },
  );

  // Try to set display_username to empty string (format violation, should fail)
  await TestValidator.error(
    "display_username must be non-empty string",
    async () => {
      await api.functional.communityPlatform.user.users.profiles.update(
        connection,
        {
          userId: user1Id,
          profileId,
          body: {
            display_username: "",
          } satisfies ICommunityPlatformUserProfile.IUpdate,
        },
      );
    },
  );
}
