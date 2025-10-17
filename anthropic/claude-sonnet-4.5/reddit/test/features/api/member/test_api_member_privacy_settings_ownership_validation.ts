import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikeUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeUser";

/**
 * Test privacy settings ownership validation.
 *
 * Validates that users can only update their own privacy settings and cannot
 * modify privacy settings for other users' accounts. This test creates two
 * separate member accounts, authenticates as the first member, then attempts to
 * update the privacy settings for the second member's userId.
 *
 * The operation should be rejected with an authorization error since the
 * authenticated user ID does not match the userId path parameter. This confirms
 * the security requirement that privacy settings modification is restricted to
 * the profile owner only.
 *
 * Steps:
 *
 * 1. Create first member account (the authenticated user)
 * 2. Create second member account (the target user)
 * 3. Re-authenticate as the first member
 * 4. Attempt to update second member's privacy settings
 * 5. Verify the operation is rejected with an error
 */
export async function test_api_member_privacy_settings_ownership_validation(
  connection: api.IConnection,
) {
  // Step 1: Create first member account
  const firstMemberBody = {
    username: typia.random<
      string &
        tags.MinLength<3> &
        tags.MaxLength<20> &
        tags.Pattern<"^[a-zA-Z0-9_-]+$">
    >(),
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
  } satisfies IRedditLikeMember.ICreate;

  const firstMember = await api.functional.auth.member.join(connection, {
    body: firstMemberBody,
  });
  typia.assert(firstMember);

  // Step 2: Create second member account
  const secondMemberBody = {
    username: typia.random<
      string &
        tags.MinLength<3> &
        tags.MaxLength<20> &
        tags.Pattern<"^[a-zA-Z0-9_-]+$">
    >(),
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
  } satisfies IRedditLikeMember.ICreate;

  const secondMember = await api.functional.auth.member.join(connection, {
    body: secondMemberBody,
  });
  typia.assert(secondMember);

  // Step 3: Re-authenticate as the first member
  // After creating secondMember, we're authenticated as secondMember
  // We need to authenticate as firstMember to test the authorization failure
  const firstMemberReauth = await api.functional.auth.member.join(connection, {
    body: firstMemberBody,
  });
  typia.assert(firstMemberReauth);

  // Step 4: Attempt to update second member's privacy settings
  // This should fail because firstMember is trying to modify secondMember's privacy
  const privacyUpdateBody = {
    profile_privacy: "private",
    show_karma_publicly: false,
    show_subscriptions_publicly: false,
  } satisfies IRedditLikeUser.IUpdatePrivacy;

  await TestValidator.error(
    "should reject privacy update for different user",
    async () => {
      await api.functional.redditLike.member.users.privacy.updatePrivacy(
        connection,
        {
          userId: secondMember.id,
          body: privacyUpdateBody,
        },
      );
    },
  );
}
