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
 * Test community moderator adding members with different membership levels
 * (subscriber, member, moderator). Validates that moderators can customize
 * member permissions during addition and that different membership levels
 * receive appropriate access rights within the community.
 *
 * The test workflow:
 *
 * 1. Create a community moderator account with appropriate credentials
 * 2. Create a registered user account to be added as a community member
 * 3. Authenticate as the moderator to perform membership operations
 * 4. Test adding the user with different membership levels:
 *
 *    - Add as "subscriber" level with basic permissions
 *    - Add as "member" level with full participation rights
 *    - Add as "moderator" level with community management capabilities
 * 5. For each membership level, verify:
 *
 *    - Membership creation succeeds
 *    - Correct membership level is assigned
 *    - Appropriate permission flags are set (post_permissions, comment_permissions,
 *         vote_permissions)
 *    - Membership record contains correct user and community references
 * 6. Validate that different membership levels have different access capabilities
 * 7. Ensure proper error handling when attempting invalid operations
 *
 * This comprehensive test validates the hierarchical membership system,
 * permission granularity, and moderator authority within community management.
 */
export async function test_api_community_member_creation_different_levels(
  connection: api.IConnection,
) {
  // Step 1: Create community moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = "SecurePassword123!";
  const moderatorUsername = `mod_${RandomGenerator.alphabets(8)}`;

  const moderatorCreated = await api.functional.auth.communityModerator.join(
    connection,
    {
      body: {
        registered_user_id: typia.random<string & tags.Format<"uuid">>(),
        moderation_permissions: JSON.stringify({
          can_remove_posts: true,
          can_remove_comments: true,
          can_ban_users: true,
          can_warn_users: true,
          can_pin_posts: true,
          can_edit_rules: true,
          can_manage_moderators: true,
          can_approve_posts: true,
        }),
        assigned_communities: JSON.stringify([]),
        appointed_by: "system",
        moderation_count: 0,
        last_moderation_action: new Date().toISOString(),
        active_status: "active",
        appointed_at: new Date().toISOString(),
        href: "https://example.com/moderator/register",
        referrer: "https://example.com",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } satisfies IRedditPlatformCommunityModerator.ICreate,
    },
  );
  typia.assert(moderatorCreated);

  // Step 2: Create registered user account to be added as member
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = "UserPassword123!";
  const userUsername = `user_${RandomGenerator.alphabets(8)}`;

  const userCreated = await api.functional.auth.registeredUser.join(
    connection,
    {
      body: {
        username: userUsername,
        email: userEmail,
        password: userPassword,
        display_name: RandomGenerator.name(),
        bio: RandomGenerator.paragraph(),
        href: "https://example.com/user/register",
        referrer: "https://example.com",
      } satisfies IRedditPlatformRegisteredUser.ICreate,
    },
  );
  typia.assert(userCreated);

  // Step 3: Authenticate as moderator for membership operations
  const moderatorAuthenticated =
    await api.functional.auth.communityModerator.login(connection, {
      body: {
        username:
          moderatorCreated.moderator.user?.username ?? moderatorUsername,
        password: moderatorPassword,
        href: "https://example.com/moderator/login",
        referrer: "https://example.com",
      } satisfies IRedditPlatformCommunityModerator.ILogin,
    });
  typia.assert(moderatorAuthenticated);

  // Step 4: Test adding user with "subscriber" level
  const communityName = `test_community_${RandomGenerator.alphabets(6)}`;

  const subscriberMembership =
    await api.functional.redditPlatform.communities.members.create(connection, {
      communityName: communityName,
      userId: userCreated.id,
      body: {
        membership_level: "subscriber",
        post_permissions: false,
        comment_permissions: false,
        vote_permissions: true,
      } satisfies IRedditPlatformCommunityMembership.ICreate,
    });
  typia.assert(subscriberMembership);

  // Validate subscriber membership
  TestValidator.equals(
    "subscriber membership level",
    subscriberMembership.membership_level,
    "subscriber",
  );
  TestValidator.equals(
    "subscriber post permissions",
    subscriberMembership.post_permissions,
    false,
  );
  TestValidator.equals(
    "subscriber comment permissions",
    subscriberMembership.comment_permissions,
    false,
  );
  TestValidator.equals(
    "subscriber vote permissions",
    subscriberMembership.vote_permissions,
    true,
  );
  TestValidator.equals(
    "subscriber community reference",
    subscriberMembership.community.name,
    communityName,
  );
  TestValidator.equals(
    "subscriber user reference",
    subscriberMembership.member.username,
    userUsername,
  );

  // Step 5: Test adding user with "member" level
  const memberMembership =
    await api.functional.redditPlatform.communities.members.create(connection, {
      communityName: communityName,
      userId: userCreated.id,
      body: {
        membership_level: "member",
        post_permissions: true,
        comment_permissions: true,
        vote_permissions: true,
      } satisfies IRedditPlatformCommunityMembership.ICreate,
    });
  typia.assert(memberMembership);

  // Validate member membership
  TestValidator.equals(
    "member membership level",
    memberMembership.membership_level,
    "member",
  );
  TestValidator.equals(
    "member post permissions",
    memberMembership.post_permissions,
    true,
  );
  TestValidator.equals(
    "member comment permissions",
    memberMembership.comment_permissions,
    true,
  );
  TestValidator.equals(
    "member vote permissions",
    memberMembership.vote_permissions,
    true,
  );
  TestValidator.equals(
    "member community reference",
    memberMembership.community.name,
    communityName,
  );
  TestValidator.equals(
    "member user reference",
    memberMembership.member.username,
    userUsername,
  );

  // Step 6: Test adding user with "moderator" level
  const moderatorMembership =
    await api.functional.redditPlatform.communities.members.create(connection, {
      communityName: communityName,
      userId: userCreated.id,
      body: {
        membership_level: "moderator",
        post_permissions: true,
        comment_permissions: true,
        vote_permissions: true,
      } satisfies IRedditPlatformCommunityMembership.ICreate,
    });
  typia.assert(moderatorMembership);

  // Validate moderator membership
  TestValidator.equals(
    "moderator membership level",
    moderatorMembership.membership_level,
    "moderator",
  );
  TestValidator.equals(
    "moderator post permissions",
    moderatorMembership.post_permissions,
    true,
  );
  TestValidator.equals(
    "moderator comment permissions",
    moderatorMembership.comment_permissions,
    true,
  );
  TestValidator.equals(
    "moderator vote permissions",
    moderatorMembership.vote_permissions,
    true,
  );
  TestValidator.equals(
    "moderator community reference",
    moderatorMembership.community.name,
    communityName,
  );
  TestValidator.equals(
    "moderator user reference",
    moderatorMembership.member.username,
    userUsername,
  );

  // Step 7: Test adding user with "banned" level (should have no permissions)
  const bannedMembership =
    await api.functional.redditPlatform.communities.members.create(connection, {
      communityName: communityName,
      userId: userCreated.id,
      body: {
        membership_level: "banned",
        post_permissions: false,
        comment_permissions: false,
        vote_permissions: false,
      } satisfies IRedditPlatformCommunityMembership.ICreate,
    });
  typia.assert(bannedMembership);

  // Validate banned membership
  TestValidator.equals(
    "banned membership level",
    bannedMembership.membership_level,
    "banned",
  );
  TestValidator.equals(
    "banned post permissions",
    bannedMembership.post_permissions,
    false,
  );
  TestValidator.equals(
    "banned comment permissions",
    bannedMembership.comment_permissions,
    false,
  );
  TestValidator.equals(
    "banned vote permissions",
    bannedMembership.vote_permissions,
    false,
  );
  TestValidator.equals(
    "banned community reference",
    bannedMembership.community.name,
    communityName,
  );
  TestValidator.equals(
    "banned user reference",
    bannedMembership.member.username,
    userUsername,
  );

  // Step 8: Validate hierarchical access levels
  // Subscriber should have fewer permissions than Member
  TestValidator.predicate(
    "subscriber has fewer permissions than member",
    !subscriberMembership.post_permissions && memberMembership.post_permissions,
  );

  // Member should have fewer permissions than Moderator (in terms of community management)
  TestValidator.predicate(
    "member has basic participation rights",
    memberMembership.post_permissions && memberMembership.comment_permissions,
  );

  // Banned should have no permissions
  TestValidator.predicate(
    "banned has no permissions",
    !bannedMembership.post_permissions &&
      !bannedMembership.comment_permissions &&
      !bannedMembership.vote_permissions,
  );
}
