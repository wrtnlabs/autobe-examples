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
 * Test community moderator adding a new member to a community.
 *
 * Validates that moderators can effectively manage community growth by
 * approving and adding new members. The scenario includes moderator
 * authentication, community setup, and successful member addition with proper
 * permission configuration.
 *
 * This test involves multiple user actors (moderator and regular user) to
 * validate cross-actor interactions and authorization boundaries within
 * community management.
 */
export async function test_api_community_member_creation_by_moderator(
  connection: api.IConnection,
) {
  // Step 1: Create community moderator account
  const moderatorEmail: string = typia.random<string & tags.Format<"email">>();
  const moderatorRegisteredUser = await api.functional.auth.registeredUser.join(
    connection,
    {
      body: {
        username: `mod_${RandomGenerator.alphaNumeric(8)}`,
        email: moderatorEmail,
        password: "secure_password_123",
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IRedditPlatformRegisteredUser.ICreate,
    },
  );
  typia.assert(moderatorRegisteredUser);

  // Step 2: Create moderator profile based on registered user
  const moderator = await api.functional.auth.communityModerator.join(
    connection,
    {
      body: {
        registered_user_id: moderatorRegisteredUser.id,
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
        assigned_communities: JSON.stringify(["test_community"]),
        appointed_by: "admin_user",
        moderation_count: 0,
        last_moderation_action: new Date().toISOString(),
        active_status: "active",
        appointed_at: new Date().toISOString(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } satisfies IRedditPlatformCommunityModerator.ICreate,
    },
  );
  typia.assert(moderator);

  // Step 3: Create regular user account who will be added as member
  const userEmail: string = typia.random<string & tags.Format<"email">>();
  const registeredUser = await api.functional.auth.registeredUser.join(
    connection,
    {
      body: {
        username: `user_${RandomGenerator.alphaNumeric(8)}`,
        email: userEmail,
        password: "user_password_123",
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IRedditPlatformRegisteredUser.ICreate,
    },
  );
  typia.assert(registeredUser);

  // Step 4: Login as moderator to perform member addition
  await api.functional.auth.communityModerator.login(connection, {
    body: {
      username: moderatorEmail,
      password: "secure_password_123",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditPlatformCommunityModerator.ILogin,
  });

  // Step 5: Add regular user as member to test community
  const communityName = "test_community";
  const membership =
    await api.functional.redditPlatform.communities.members.create(connection, {
      communityName: communityName,
      userId: registeredUser.id,
      body: {
        membership_level: "member",
        post_permissions: true,
        comment_permissions: true,
        vote_permissions: true,
      } satisfies IRedditPlatformCommunityMembership.ICreate,
    });
  typia.assert(membership);

  // Step 6: Validate membership creation
  TestValidator.equals(
    "membership community name matches",
    membership.community.name,
    communityName,
  );
  TestValidator.equals(
    "member user ID matches",
    membership.member.id,
    registeredUser.id,
  );
  TestValidator.equals(
    "membership level is member",
    membership.membership_level,
    "member",
  );
  TestValidator.equals(
    "post permissions granted",
    membership.post_permissions,
    true,
  );
  TestValidator.equals(
    "comment permissions granted",
    membership.comment_permissions,
    true,
  );
  TestValidator.equals(
    "vote permissions granted",
    membership.vote_permissions,
    true,
  );
}
