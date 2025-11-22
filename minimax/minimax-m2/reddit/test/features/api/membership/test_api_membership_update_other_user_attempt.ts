import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformCommunityMembership } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunityMembership";
import type { IRedditPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunityModerator";
import type { IRedditPlatformRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformRegisteredUser";

/**
 * Test that users cannot update other users' membership records.
 *
 * This test verifies the API properly validates ownership and prevents
 * unauthorized modifications to other users' community memberships. Users
 * should only be able to update their own membership records within
 * communities.
 *
 * The test creates two users, establishes a legitimate membership for User A,
 * then attempts to have User B modify User A's membership, which should fail
 * due to proper authorization controls.
 */
export async function test_api_membership_update_other_user_attempt(
  connection: api.IConnection,
) {
  // Step 1: Create first registered user (User A - will own the membership)
  const userAEmail: string = typia.random<string & tags.Format<"email">>();
  const userA: IRedditPlatformRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.join(connection, {
      body: {
        username: `userA_${RandomGenerator.alphaNumeric(8)}`,
        email: userAEmail,
        password: "password123",
        href: "https://example.com/userA",
        referrer: "https://example.com",
      } satisfies IRedditPlatformRegisteredUser.ICreate,
    });
  typia.assert(userA);

  // Step 2: Create second registered user (User B - will attempt unauthorized update)
  const userBEmail: string = typia.random<string & tags.Format<"email">>();
  const userB: IRedditPlatformRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.join(connection, {
      body: {
        username: `userB_${RandomGenerator.alphaNumeric(8)}`,
        email: userBEmail,
        password: "password123",
        href: "https://example.com/userB",
        referrer: "https://example.com",
      } satisfies IRedditPlatformRegisteredUser.ICreate,
    });
  typia.assert(userB);

  // Step 3: Add User A as member to a community (create the target membership)
  const communityName = `test_community_${RandomGenerator.alphaNumeric(8)}`;
  const userAMembership: IRedditPlatformCommunityMembership =
    await api.functional.redditPlatform.communities.members.create(connection, {
      communityName: communityName,
      userId: userA.id,
      body: {
        membership_level: "member",
        post_permissions: true,
        comment_permissions: true,
        vote_permissions: true,
      } satisfies IRedditPlatformCommunityMembership.ICreate,
    });
  typia.assert(userAMembership);

  // Step 4: Switch authentication to User B (unauthorized actor)
  await api.functional.auth.registeredUser.login(connection, {
    body: {
      email: userBEmail,
      password: "password123",
      href: "https://example.com/userB",
      referrer: "https://example.com",
    } satisfies IRedditPlatformRegisteredUser.ILogin,
  });

  // Step 5: Attempt to update User A's membership while authenticated as User B
  // This should fail due to ownership validation - User B cannot modify User A's membership
  await TestValidator.error(
    "unauthorized user cannot update another user's membership",
    async () => {
      await api.functional.redditPlatform.memberships.update(connection, {
        membershipId: userAMembership.id,
        body: {
          post_permissions: false,
          comment_permissions: false,
          vote_permissions: false,
        } satisfies IRedditPlatformCommunityMembership.IUpdate,
      });
    },
  );
}
