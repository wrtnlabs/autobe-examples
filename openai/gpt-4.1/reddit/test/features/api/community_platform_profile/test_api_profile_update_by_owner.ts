import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProfile";

/**
 * Test an authenticated member's ability to update their own profile, covering
 * all updatable fields and business constraints.
 *
 * 1. Register a new member (which creates a profile associated with this member).
 * 2. Attempt to update profile fields (username, bio, status_message, avatar_uri,
 *    display_email, is_public) with new valid values (and edge-case lengths for
 *    strings).
 * 3. Validate changes: ensure all updates are reflected and returned as expected.
 * 4. Test business rules: attempt to update username to one that is already taken
 *    and expect an error.
 * 5. Validate that the user can update their profile privacy setting (is_public).
 * 6. Optionally, attempt to update another user's profile as this member and
 *    confirm the operation is rejected (not permitted).
 */
export async function test_api_profile_update_by_owner(
  connection: api.IConnection,
) {
  // 1. Register member (which creates a profile)
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = RandomGenerator.alphaNumeric(12);
  const auth: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        password: memberPassword,
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(auth);

  // 2. Prepare profile update data (all editable fields, valid values)
  const updateData = {
    username: RandomGenerator.alphaNumeric(10), // change to a new unique username
    bio: RandomGenerator.paragraph({ sentences: 10, wordMin: 5, wordMax: 10 }),
    avatar_uri: typia.random<string & tags.Format<"uri">>(),
    display_email: typia.random<string & tags.Format<"email">>(),
    status_message: RandomGenerator.paragraph({ sentences: 3 }),
    is_public: false,
  } satisfies ICommunityPlatformProfile.IUpdate;

  // 3. Update the member's own profile (the only updatable profile for this account)
  // We "guess" that the member's profileId is equal to their member id, as no profile API for self-fetch is given; if not, a real API should be called here to resolve this mapping.
  // Typical platforms use member id == profile id for 1:1 mapping.
  const updated: ICommunityPlatformProfile =
    await api.functional.communityPlatform.member.profiles.update(connection, {
      profileId: auth.id as string & tags.Format<"uuid">,
      body: updateData,
    });
  typia.assert(updated);
  TestValidator.equals(
    "profile username (updated)",
    updated.username,
    updateData.username,
  );
  TestValidator.equals("profile bio (updated)", updated.bio, updateData.bio);
  TestValidator.equals(
    "profile avatar_uri (updated)",
    updated.avatar_uri,
    updateData.avatar_uri,
  );
  TestValidator.equals(
    "profile display_email (updated)",
    updated.display_email,
    updateData.display_email,
  );
  TestValidator.equals(
    "profile status_message (updated)",
    updated.status_message,
    updateData.status_message,
  );
  TestValidator.equals(
    "profile privacy (updated)",
    updated.is_public,
    updateData.is_public,
  );
  TestValidator.equals(
    "profile member id unchanged",
    updated.community_platform_member_id,
    auth.id,
  );

  // 4. Edge: username uniqueness (second member, try to take username)
  const member2Email = typia.random<string & tags.Format<"email">>();
  const member2Password = RandomGenerator.alphaNumeric(12);
  const auth2: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: member2Email,
        password: member2Password,
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(auth2);

  // Attempt duplicate username (should fail: username must be unique)
  await TestValidator.error(
    "cannot set username to existing username",
    async () => {
      await api.functional.communityPlatform.member.profiles.update(
        connection,
        {
          profileId: auth2.id as string & tags.Format<"uuid">,
          body: {
            username: updateData.username, // already used by member 1
          } satisfies ICommunityPlatformProfile.IUpdate,
        },
      );
    },
  );

  // 5. Set privacy back to public for profile
  const publicUpdateData = {
    is_public: true,
  } satisfies ICommunityPlatformProfile.IUpdate;

  const publicUpdated: ICommunityPlatformProfile =
    await api.functional.communityPlatform.member.profiles.update(connection, {
      profileId: auth.id as string & tags.Format<"uuid">,
      body: publicUpdateData,
    });
  typia.assert(publicUpdated);
  TestValidator.equals(
    "profile privacy (toggle back public)",
    publicUpdated.is_public,
    true,
  );
}
