import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikeUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeUser";

/**
 * Test authorization enforcement ensuring members can only update their own
 * profiles.
 *
 * This test validates the critical security requirement that users cannot
 * modify other users' profile information. It creates two separate member
 * accounts through registration and verifies that one member cannot update
 * another member's profile.
 *
 * Steps:
 *
 * 1. Register first member account (userA) and obtain authentication token
 * 2. Register second member account (userB) with different credentials
 * 3. System is now authenticated as userB (last registration sets the token)
 * 4. Attempt to update userA's profile while authenticated as userB
 * 5. Validate that the operation fails with an authorization error
 *
 * Expected outcome: The system rejects the unauthorized profile update attempt,
 * confirming proper ownership validation and preventing cross-user profile
 * modifications.
 */
export async function test_api_member_profile_update_ownership_validation(
  connection: api.IConnection,
) {
  // Step 1: Register first member account (userA)
  const userAEmail = typia.random<string & tags.Format<"email">>();
  const userAPassword = typia.random<string & tags.MinLength<8>>();
  const userAUsername = RandomGenerator.alphaNumeric(10);

  const userA = await api.functional.auth.member.join(connection, {
    body: {
      username: userAUsername,
      email: userAEmail,
      password: userAPassword,
    } satisfies IRedditLikeMember.ICreate,
  });
  typia.assert(userA);

  // Step 2: Register second member account (userB)
  // After this registration, the SDK automatically sets userB's authentication token
  const userBEmail = typia.random<string & tags.Format<"email">>();
  const userBPassword = typia.random<string & tags.MinLength<8>>();
  const userBUsername = RandomGenerator.alphaNumeric(10);

  const userB = await api.functional.auth.member.join(connection, {
    body: {
      username: userBUsername,
      email: userBEmail,
      password: userBPassword,
    } satisfies IRedditLikeMember.ICreate,
  });
  typia.assert(userB);

  // Step 3: At this point, connection is authenticated as userB (the SDK set the token automatically)
  // Now attempt to update userA's profile while authenticated as userB
  const unauthorizedUpdateData = {
    profile_bio: "Unauthorized modification attempt",
    avatar_url: "https://example.com/unauthorized-avatar.jpg",
  } satisfies IRedditLikeUser.IProfileUpdate;

  // Step 4: Validate that the unauthorized update attempt is rejected
  // userB should NOT be able to update userA's profile
  await TestValidator.error(
    "member cannot update another member's profile",
    async () => {
      await api.functional.redditLike.member.users.profile.update(connection, {
        userId: userA.id,
        body: unauthorizedUpdateData,
      });
    },
  );
}
