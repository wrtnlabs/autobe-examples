import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunityModerator";
import type { IRedditPlatformRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformRegisteredUser";

export async function test_api_moderator_login_success(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account using join endpoint
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = "SecurePassword123!";
  const registeredUserId = typia.random<string & tags.Format<"uuid">>();
  const assignedCommunities = JSON.stringify(["community-1", "community-2"]);
  const moderationPermissions = JSON.stringify({
    can_remove_posts: true,
    can_remove_comments: true,
    can_ban_users: false,
    can_warn_users: true,
    can_pin_posts: false,
    can_edit_rules: false,
    can_manage_moderators: false,
    can_approve_posts: true,
  });

  const createResponse = await api.functional.auth.communityModerator.join(
    connection,
    {
      body: {
        registered_user_id: registeredUserId,
        moderation_permissions: moderationPermissions,
        assigned_communities: assignedCommunities,
        appointed_by: "system-admin",
        moderation_count: 0,
        last_moderation_action: new Date().toISOString(),
        active_status: "active",
        appointed_at: new Date().toISOString(),
        href: "https://reddit-platform.example.com/join",
        referrer: "https://reddit-platform.example.com/",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } satisfies IRedditPlatformCommunityModerator.ICreate,
    },
  );

  // Validate the creation response
  typia.assert(createResponse);
  TestValidator.equals(
    "moderator account created",
    createResponse.moderator.active_status,
    "active",
  );
  TestValidator.predicate(
    "moderator has assigned communities",
    createResponse.moderator.assigned_communities.length > 0,
  );

  // Step 2: Test successful login with the created credentials
  const loginResponse = await api.functional.auth.communityModerator.login(
    connection,
    {
      body: {
        username: moderatorEmail,
        password: moderatorPassword,
        href: "https://reddit-platform.example.com/login",
        referrer: "https://reddit-platform.example.com/",
      } satisfies IRedditPlatformCommunityModerator.ILogin,
    },
  );

  // Step 3: Validate login response structure
  typia.assert(loginResponse);
  TestValidator.equals(
    "login returns authorized moderator",
    loginResponse.moderator.active_status,
    "active",
  );

  // Step 4: Validate token structure and expiration times
  const token = loginResponse.token;
  typia.assert(token);
  TestValidator.predicate("access token exists", token.access.length > 0);
  TestValidator.predicate("refresh token exists", token.refresh.length > 0);
  TestValidator.predicate(
    "access token has expiration",
    token.expired_at.length > 0,
  );
  TestValidator.predicate(
    "refresh token has expiration",
    token.refreshable_until.length > 0,
  );

  // Step 5: Validate token expiration times are reasonable (access: 15min, refresh: 7 days)
  const accessExpiry = new Date(token.expired_at);
  const refreshExpiry = new Date(token.refreshable_until);
  const now = new Date();

  const accessExpiryMinutes =
    (accessExpiry.getTime() - now.getTime()) / (1000 * 60);
  const refreshExpiryDays =
    (refreshExpiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);

  TestValidator.predicate(
    "access token expires in approximately 15 minutes",
    accessExpiryMinutes >= 14 && accessExpiryMinutes <= 16,
  );
  TestValidator.predicate(
    "refresh token expires in approximately 7 days",
    refreshExpiryDays >= 6.5 && refreshExpiryDays <= 7.5,
  );

  // Step 6: Validate moderator permissions integrity
  const permissions = loginResponse.moderator.moderation_permissions;
  typia.assert(permissions);
  TestValidator.equals(
    "can remove posts permission",
    permissions.can_remove_posts,
    true,
  );
  TestValidator.equals(
    "can remove comments permission",
    permissions.can_remove_comments,
    true,
  );
  TestValidator.equals(
    "can ban users permission",
    permissions.can_ban_users,
    false,
  );
  TestValidator.equals(
    "can warn users permission",
    permissions.can_warn_users,
    true,
  );
  TestValidator.equals(
    "can pin posts permission",
    permissions.can_pin_posts,
    false,
  );
  TestValidator.equals(
    "can edit rules permission",
    permissions.can_edit_rules,
    false,
  );
  TestValidator.equals(
    "can manage moderators permission",
    permissions.can_manage_moderators,
    false,
  );
  TestValidator.equals(
    "can approve posts permission",
    permissions.can_approve_posts,
    true,
  );

  // Step 7: Validate assigned communities access
  TestValidator.predicate(
    "moderator has assigned communities",
    loginResponse.moderator.assigned_communities.length > 0,
  );
  TestValidator.equals(
    "assigned communities match creation",
    loginResponse.moderator.assigned_communities,
    JSON.parse(assignedCommunities),
  );

  // Step 8: Validate moderator profile integrity
  TestValidator.predicate(
    "moderator ID exists",
    loginResponse.moderator.id.length > 0,
  );
  TestValidator.predicate(
    "registered user ID exists",
    loginResponse.moderator.reddit_platform_registereduser_id.length > 0,
  );
  TestValidator.equals(
    "appointed by matches",
    loginResponse.moderator.appointed_by,
    "system-admin",
  );
  TestValidator.equals(
    "moderation count is tracked",
    loginResponse.moderator.moderation_count,
    0,
  );
  TestValidator.equals(
    "active status confirmed",
    loginResponse.moderator.active_status,
    "active",
  );

  // Step 9: Validate user context inheritance
  if (loginResponse.moderator.user) {
    const user = loginResponse.moderator.user;
    typia.assert(user);
    TestValidator.predicate("user ID exists", user.id.length > 0);
    TestValidator.predicate("username exists", user.username.length > 0);
    TestValidator.predicate(
      "karma score is tracked",
      typeof user.karma_score === "number",
    );
  }
}
