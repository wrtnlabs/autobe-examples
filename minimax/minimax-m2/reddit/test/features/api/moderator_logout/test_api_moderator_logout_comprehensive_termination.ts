import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditPlatformAuthLogoutResponse } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformAuthLogoutResponse";
import type { IRedditPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunityModerator";
import type { IRedditPlatformRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformRegisteredUser";

export async function test_api_moderator_logout_comprehensive_termination(
  connection: api.IConnection,
) {
  // Step 1: Create community moderator account with elevated privileges
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = "SecureModerator123!";

  // First create registered user, then upgrade to moderator
  const registeredModerator = await api.functional.auth.registeredUser.join(
    connection,
    {
      body: {
        username: RandomGenerator.alphaNumeric(10),
        email: moderatorEmail,
        password: moderatorPassword,
        display_name: "Senior Moderator",
        bio: "Experienced community moderator with full platform access",
        location: "Moderation Center",
        website_url: typia.random<string & tags.Format<"uri">>(),
        avatar_url: typia.random<string & tags.Format<"uri">>(),
        ip: "192.168.1.100",
        href: "https://community.example.com/moderator/join",
        referrer: "https://community.example.com/admin/appoint",
      } satisfies IRedditPlatformRegisteredUser.ICreate,
    },
  );
  typia.assert(registeredModerator);

  // Create community moderator profile
  const moderatorProfile = await api.functional.auth.communityModerator.join(
    connection,
    {
      body: {
        registered_user_id: registeredModerator.id,
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
        assigned_communities: JSON.stringify([
          "tech-support",
          "help-desk",
          "community-guidelines",
          "platform-rules",
        ]),
        appointed_by: "super-admin",
        moderation_count: 0,
        last_moderation_action: new Date().toISOString(),
        active_status: "active",
        appointed_at: new Date().toISOString(),
        ip: "192.168.1.100",
        href: "https://community.example.com/moderator/dashboard",
        referrer: "https://community.example.com/admin/appoint",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } satisfies IRedditPlatformCommunityModerator.ICreate,
    },
  );
  typia.assert(moderatorProfile);

  // Step 2: Create regular user account for cross-actor interactions
  const userEmail = typia.random<string & tags.Format<"email">>();
  const regularUser = await api.functional.auth.registeredUser.join(
    connection,
    {
      body: {
        username: RandomGenerator.alphaNumeric(10),
        email: userEmail,
        password: "UserPassword456!",
        display_name: "Regular User",
        bio: "Active community member",
        location: "Community District",
        website_url: typia.random<string & tags.Format<"uri">>(),
        avatar_url: typia.random<string & tags.Format<"uri">>(),
        ip: "192.168.1.101",
        href: "https://community.example.com/signup",
        referrer: "https://community.example.com/landing",
      } satisfies IRedditPlatformRegisteredUser.ICreate,
    },
  );
  typia.assert(regularUser);

  // Step 3: Authenticate moderator with elevated privileges
  const moderatorAuth = await api.functional.auth.communityModerator.login(
    connection,
    {
      body: {
        username: moderatorEmail,
        password: moderatorPassword,
        href: "https://community.example.com/moderator/login",
        referrer: "https://community.example.com/moderator/dashboard",
        ip: "192.168.1.100",
      } satisfies IRedditPlatformCommunityModerator.ILogin,
    },
  );
  typia.assert(moderatorAuth);

  // Step 4: Authenticate regular user
  const userAuth = await api.functional.auth.registeredUser.login(connection, {
    body: {
      email: userEmail,
      password: "UserPassword456!",
      ip: "192.168.1.101",
      href: "https://community.example.com/login",
      referrer: "https://community.example.com/home",
    } satisfies IRedditPlatformRegisteredUser.ILogin,
  });
  typia.assert(userAuth);

  // Step 5: Validate moderator authentication and privileges
  TestValidator.equals(
    "moderator authentication successful",
    moderatorAuth.moderator.active_status,
    "active",
  );
  TestValidator.predicate(
    "moderator has full permissions",
    moderatorAuth.moderator.moderation_permissions.can_remove_posts &&
      moderatorAuth.moderator.moderation_permissions.can_ban_users &&
      moderatorAuth.moderator.moderation_permissions.can_manage_moderators,
  );

  // Step 6: Execute comprehensive logout operation
  const logoutResponse =
    await api.functional.redditPlatform.registeredUser.auth.sessions.logout(
      connection,
    );
  typia.assert(logoutResponse);

  // Step 7: Validate logout response and session termination
  TestValidator.equals(
    "logout operation successful",
    logoutResponse.success,
    true,
  );
  TestValidator.predicate(
    "session termination timestamp exists",
    logoutResponse.session_terminated_at.length > 0,
  );
  TestValidator.equals(
    "tokens invalidated successfully",
    logoutResponse.tokens_invalidated,
    true,
  );

  // Step 8: Verify no residual session access
  await TestValidator.error(
    "moderator cannot access after logout",
    async () => {
      await api.functional.auth.communityModerator.login(connection, {
        body: {
          username: moderatorEmail,
          password: moderatorPassword,
          href: "https://community.example.com/moderator/relogin",
          referrer: "https://community.example.com/moderator/dashboard",
          ip: "192.168.1.100",
        } satisfies IRedditPlatformCommunityModerator.ILogin,
      });
    },
  );

  // Step 9: Test user logout for comparison
  const userLogoutResponse =
    await api.functional.redditPlatform.registeredUser.auth.sessions.logout(
      connection,
    );
  typia.assert(userLogoutResponse);
  TestValidator.equals(
    "user logout also successful",
    userLogoutResponse.success,
    true,
  );

  // Step 10: Validate security audit trail
  TestValidator.predicate(
    "logout timestamp is valid ISO format",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(
      logoutResponse.session_terminated_at,
    ),
  );
}
