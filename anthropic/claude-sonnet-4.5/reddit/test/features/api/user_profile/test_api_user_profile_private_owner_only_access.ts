import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikeUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeUser";

/**
 * Test that profiles with 'private' privacy setting are only accessible to the
 * profile owner.
 *
 * This test validates the strictest privacy level in the system where a user's
 * profile is completely hidden from all other users. Due to API limitations (no
 * login endpoint available), this test focuses on verifying that non-owner
 * users cannot access private profiles.
 *
 * Workflow:
 *
 * 1. Create first member account (profile owner)
 * 2. Update privacy settings to 'private'
 * 3. Create second member account (different user)
 * 4. Verify second user cannot access the private profile
 */
export async function test_api_user_profile_private_owner_only_access(
  connection: api.IConnection,
) {
  // 1. Create first member account (profile owner)
  const ownerEmail = typia.random<string & tags.Format<"email">>();
  const ownerUsername = RandomGenerator.alphaNumeric(10);
  const ownerPassword = RandomGenerator.alphaNumeric(12);

  const profileOwner = await api.functional.auth.member.join(connection, {
    body: {
      username: ownerUsername,
      email: ownerEmail,
      password: ownerPassword,
    } satisfies IRedditLikeMember.ICreate,
  });
  typia.assert(profileOwner);

  // 2. Update privacy settings to 'private'
  const privacySettings =
    await api.functional.redditLike.member.users.privacy.updatePrivacy(
      connection,
      {
        userId: profileOwner.id,
        body: {
          profile_privacy: "private",
        } satisfies IRedditLikeUser.IUpdatePrivacy,
      },
    );
  typia.assert(privacySettings);
  TestValidator.equals(
    "privacy setting updated to private",
    privacySettings.profile_privacy,
    "private",
  );

  // 3. Create second member account (different user) - this auto-authenticates as the second user
  const otherUserEmail = typia.random<string & tags.Format<"email">>();
  const otherUsername = RandomGenerator.alphaNumeric(10);
  const otherPassword = RandomGenerator.alphaNumeric(12);

  const otherUser = await api.functional.auth.member.join(connection, {
    body: {
      username: otherUsername,
      email: otherUserEmail,
      password: otherPassword,
    } satisfies IRedditLikeMember.ICreate,
  });
  typia.assert(otherUser);

  // 4. Verify second user cannot access the private profile
  await TestValidator.error(
    "other user cannot access private profile",
    async () => {
      await api.functional.redditLike.users.profile.at(connection, {
        userId: profileOwner.id,
      });
    },
  );
}
