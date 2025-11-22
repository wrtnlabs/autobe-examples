import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformCommunityMembership } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunityMembership";
import type { IRedditPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunityModerator";
import type { IRedditPlatformRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformRegisteredUser";

export async function test_api_membership_level_change_attempt_by_user(
  connection: api.IConnection,
) {
  // Create test community name
  const communityName = `test_community_${RandomGenerator.alphaNumeric(8)}`;

  // Create registered user account
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = "TestPassword123!";
  const username = RandomGenerator.name(1);

  const registeredUser: IRedditPlatformRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.join(connection, {
      body: {
        username: username,
        email: userEmail,
        password: userPassword,
        href: "https://example.com/register",
        referrer: "https://google.com",
      } satisfies IRedditPlatformRegisteredUser.ICreate,
    });
  typia.assert(registeredUser);

  // Login as the registered user
  const loggedInUser: IRedditPlatformRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.login(connection, {
      body: {
        email: userEmail,
        password: userPassword,
        href: "https://example.com/login",
        referrer: "https://example.com/register",
      } satisfies IRedditPlatformRegisteredUser.ILogin,
    });
  typia.assert(loggedInUser);

  // Create community with a moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = "ModeratorPassword123!";
  const moderatorUsername = RandomGenerator.name(1);

  const moderatorAccount: IRedditPlatformRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.join(connection, {
      body: {
        username: moderatorUsername,
        email: moderatorEmail,
        password: moderatorPassword,
        href: "https://example.com/register",
        referrer: "https://google.com",
      } satisfies IRedditPlatformRegisteredUser.ICreate,
    });
  typia.assert(moderatorAccount);

  // Switch to moderator for community creation and member management
  await api.functional.auth.registeredUser.login(connection, {
    body: {
      email: moderatorEmail,
      password: moderatorPassword,
      href: "https://example.com/login",
      referrer: "https://example.com/register",
    } satisfies IRedditPlatformRegisteredUser.ILogin,
  });

  // Add user as subscriber to the community
  const membership: IRedditPlatformCommunityMembership =
    await api.functional.redditPlatform.communities.members.create(connection, {
      communityName: communityName,
      userId: registeredUser.id,
      body: {
        membership_level: "subscriber",
        post_permissions: true,
        comment_permissions: true,
        vote_permissions: true,
      } satisfies IRedditPlatformCommunityMembership.ICreate,
    });
  typia.assert(membership);

  // Verify membership details
  TestValidator.equals(
    "user is subscriber",
    membership.membership_level,
    "subscriber",
  );
  TestValidator.equals(
    "membership belongs to correct user",
    membership.registered_user_id,
    registeredUser.id,
  );

  // Switch back to the regular user
  await api.functional.auth.registeredUser.login(connection, {
    body: {
      email: userEmail,
      password: userPassword,
      href: "https://example.com/login",
      referrer: "https://example.com/community",
    } satisfies IRedditPlatformRegisteredUser.ILogin,
  });

  // Attempt unauthorized elevation from subscriber to member
  await TestValidator.error(
    "user cannot elevate own membership from subscriber to member",
    async () => {
      await api.functional.redditPlatform.memberships.update(connection, {
        membershipId: membership.id,
        body: {
          membership_level: "member",
        } satisfies IRedditPlatformCommunityMembership.IUpdate,
      });
    },
  );

  // Attempt unauthorized elevation from subscriber to moderator
  await TestValidator.error(
    "user cannot elevate own membership from subscriber to moderator",
    async () => {
      await api.functional.redditPlatform.memberships.update(connection, {
        membershipId: membership.id,
        body: {
          membership_level: "moderator",
        } satisfies IRedditPlatformCommunityMembership.IUpdate,
      });
    },
  );

  // Verify membership level remains unchanged
  const unchangedMembership: IRedditPlatformCommunityMembership =
    await api.functional.redditPlatform.memberships.update(connection, {
      membershipId: membership.id,
      body: {
        post_permissions: false,
      } satisfies IRedditPlatformCommunityMembership.IUpdate,
    });
  typia.assert(unchangedMembership);

  // Verify membership level is still subscriber
  TestValidator.equals(
    "membership level unchanged",
    unchangedMembership.membership_level,
    "subscriber",
  );

  // Test legitimate permission changes work
  const updatedMembership: IRedditPlatformCommunityMembership =
    await api.functional.redditPlatform.memberships.update(connection, {
      membershipId: membership.id,
      body: {
        post_permissions: false,
        comment_permissions: true,
        vote_permissions: true,
      } satisfies IRedditPlatformCommunityMembership.IUpdate,
    });
  typia.assert(updatedMembership);

  // Verify permission changes were applied but membership level unchanged
  TestValidator.equals(
    "post permissions disabled",
    updatedMembership.post_permissions,
    false,
  );
  TestValidator.equals(
    "comment permissions enabled",
    updatedMembership.comment_permissions,
    true,
  );
  TestValidator.equals(
    "vote permissions enabled",
    updatedMembership.vote_permissions,
    true,
  );
  TestValidator.equals(
    "membership level still subscriber",
    updatedMembership.membership_level,
    "subscriber",
  );
}
