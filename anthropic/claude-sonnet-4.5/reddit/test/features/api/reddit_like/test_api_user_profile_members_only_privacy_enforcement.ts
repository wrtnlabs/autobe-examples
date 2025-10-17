import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikeUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeUser";

/**
 * Test that profiles with 'members_only' privacy setting require authentication
 * to view.
 *
 * This test validates the privacy enforcement system by:
 *
 * 1. Creating a member account and setting their profile privacy to 'members_only'
 * 2. Verifying that unauthenticated (guest) access to the profile is denied
 * 3. Verifying that authenticated members can successfully view the profile
 *
 * The test ensures that the privacy restriction correctly blocks guest access
 * while allowing authenticated members to view profiles with members_only
 * privacy settings.
 */
export async function test_api_user_profile_members_only_privacy_enforcement(
  connection: api.IConnection,
) {
  // Step 1: Create the first member account whose profile will be restricted
  const firstMemberEmail = typia.random<string & tags.Format<"email">>();
  const firstMemberPassword = typia.random<string & tags.MinLength<8>>();
  const firstMember = await api.functional.auth.member.join(connection, {
    body: {
      username: typia.random<
        string &
          tags.MinLength<3> &
          tags.MaxLength<20> &
          tags.Pattern<"^[a-zA-Z0-9_-]+$">
      >(),
      email: firstMemberEmail,
      password: firstMemberPassword,
    } satisfies IRedditLikeMember.ICreate,
  });
  typia.assert(firstMember);

  // Step 2: Update the first member's privacy settings to 'members_only'
  const privacySettings =
    await api.functional.redditLike.member.users.privacy.updatePrivacy(
      connection,
      {
        userId: firstMember.id,
        body: {
          profile_privacy: "members_only",
        } satisfies IRedditLikeUser.IUpdatePrivacy,
      },
    );
  typia.assert(privacySettings);
  TestValidator.equals(
    "privacy setting updated",
    privacySettings.profile_privacy,
    "members_only",
  );

  // Step 3: Create unauthenticated connection (guest access)
  const unauthConnection: api.IConnection = { ...connection, headers: {} };

  // Step 4: Attempt to retrieve the profile without authentication - should fail
  await TestValidator.error(
    "guest access to members_only profile should be denied",
    async () => {
      await api.functional.redditLike.users.profile.at(unauthConnection, {
        userId: firstMember.id,
      });
    },
  );

  // Step 5: Create a second member account for authenticated access
  const secondMember = await api.functional.auth.member.join(connection, {
    body: {
      username: typia.random<
        string &
          tags.MinLength<3> &
          tags.MaxLength<20> &
          tags.Pattern<"^[a-zA-Z0-9_-]+$">
      >(),
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.MinLength<8>>(),
    } satisfies IRedditLikeMember.ICreate,
  });
  typia.assert(secondMember);

  // Step 6: Retrieve the privacy-restricted profile as an authenticated member - should succeed
  const retrievedProfile = await api.functional.redditLike.users.profile.at(
    connection,
    {
      userId: firstMember.id,
    },
  );
  typia.assert(retrievedProfile);

  // Step 7: Validate the retrieved profile matches the first member
  TestValidator.equals(
    "retrieved profile ID matches",
    retrievedProfile.id,
    firstMember.id,
  );
  TestValidator.equals(
    "retrieved username matches",
    retrievedProfile.username,
    firstMember.username,
  );
}
