import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikeUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeUser";

/**
 * Test the three profile visibility levels and privacy settings transitions.
 *
 * This test validates that the privacy settings API correctly handles all three
 * profile visibility levels: 'private', 'members_only', and 'public'. It
 * ensures that transitions between these states work properly and that the
 * settings are correctly persisted and returned.
 *
 * Test workflow:
 *
 * 1. Create a new member account
 * 2. Set profile_privacy to 'private' and verify
 * 3. Update profile_privacy to 'members_only' and verify
 * 4. Update profile_privacy to 'public' and verify
 * 5. Validate that all transitions work correctly
 */
export async function test_api_member_privacy_profile_visibility_levels(
  connection: api.IConnection,
) {
  // Step 1: Create a new member account
  const memberData = {
    username: RandomGenerator.name(1) + RandomGenerator.alphaNumeric(6),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(8) + "A1!",
  } satisfies IRedditLikeMember.ICreate;

  const member: IRedditLikeMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: memberData,
    });
  typia.assert(member);

  // Step 2: Set profile_privacy to 'private' and verify
  const privateSettings: IRedditLikeUser.IPrivacySettings =
    await api.functional.redditLike.member.users.privacy.updatePrivacy(
      connection,
      {
        userId: member.id,
        body: {
          profile_privacy: "private",
        } satisfies IRedditLikeUser.IUpdatePrivacy,
      },
    );
  typia.assert(privateSettings);
  TestValidator.equals(
    "profile_privacy should be set to private",
    privateSettings.profile_privacy,
    "private",
  );

  // Step 3: Update profile_privacy to 'members_only' and verify
  const membersOnlySettings: IRedditLikeUser.IPrivacySettings =
    await api.functional.redditLike.member.users.privacy.updatePrivacy(
      connection,
      {
        userId: member.id,
        body: {
          profile_privacy: "members_only",
        } satisfies IRedditLikeUser.IUpdatePrivacy,
      },
    );
  typia.assert(membersOnlySettings);
  TestValidator.equals(
    "profile_privacy should be updated to members_only",
    membersOnlySettings.profile_privacy,
    "members_only",
  );

  // Step 4: Update profile_privacy to 'public' and verify
  const publicSettings: IRedditLikeUser.IPrivacySettings =
    await api.functional.redditLike.member.users.privacy.updatePrivacy(
      connection,
      {
        userId: member.id,
        body: {
          profile_privacy: "public",
        } satisfies IRedditLikeUser.IUpdatePrivacy,
      },
    );
  typia.assert(publicSettings);
  TestValidator.equals(
    "profile_privacy should be updated to public",
    publicSettings.profile_privacy,
    "public",
  );
}
