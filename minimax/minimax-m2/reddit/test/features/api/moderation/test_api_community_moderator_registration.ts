import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunityModerator";
import type { IRedditPlatformRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformRegisteredUser";

export async function test_api_community_moderator_registration(
  connection: api.IConnection,
) {
  // Generate base registered user ID for the moderator
  const registeredUserId = typia.random<string & tags.Format<"uuid">>();

  // Create current timestamp for appointment
  const currentTime = new Date();
  const appointedAt = currentTime.toISOString();

  // Generate random IP, href, and referrer for security tracking
  const ip = typia.random<string & tags.Format<"ipv4">>();
  const href = typia.random<string & tags.Format<"uri">>();
  const referrer = typia.random<string & tags.Format<"uri">>();

  // Create moderator account creation data
  const moderatorData = {
    registered_user_id: registeredUserId,
    moderation_permissions: JSON.stringify({
      can_remove_posts: true,
      can_remove_comments: true,
      can_ban_users: true,
      can_warn_users: true,
      can_pin_posts: true,
      can_edit_rules: false,
      can_manage_moderators: false,
      can_approve_posts: true,
    }),
    assigned_communities: JSON.stringify([
      "community-1",
      "community-2",
      "community-3",
    ]),
    appointed_by: "admin-user-123",
    moderation_count: 0,
    last_moderation_action: appointedAt,
    active_status: "active",
    appointed_at: appointedAt,
    ip: ip,
    href: href,
    referrer: referrer,
    created_at: currentTime.toISOString(),
    updated_at: currentTime.toISOString(),
  } satisfies IRedditPlatformCommunityModerator.ICreate;

  // Call the community moderator registration endpoint
  const response: IRedditPlatformCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.join(connection, {
      body: moderatorData,
    });

  // Perform comprehensive validation using typia.assert
  typia.assert(response);

  // Extract moderator data for cleaner validation
  const moderatorProfile = response.moderator;
  const authToken = response.token;

  // Validate authentication token structure
  TestValidator.equals("authentication token exists", authToken, authToken);
  TestValidator.predicate(
    "access token is not empty",
    authToken.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token is not empty",
    authToken.refresh.length > 0,
  );
  TestValidator.predicate(
    "access token has expiration",
    !!authToken.expired_at,
  );
  TestValidator.predicate(
    "refresh token has expiration",
    !!authToken.refreshable_until,
  );

  // Validate moderator profile structure
  TestValidator.equals(
    "moderator ID is valid UUID",
    moderatorProfile.id,
    moderatorProfile.id,
  );
  TestValidator.equals(
    "registered user ID matches",
    moderatorProfile.reddit_platform_registereduser_id,
    registeredUserId,
  );
  TestValidator.equals(
    "moderation count starts at zero",
    moderatorProfile.moderation_count,
    0,
  );
  TestValidator.equals(
    "active status is correct",
    moderatorProfile.active_status,
    "active",
  );
  TestValidator.equals(
    "appointed by matches",
    moderatorProfile.appointed_by,
    "admin-user-123",
  );
  TestValidator.equals(
    "appointment timestamp exists",
    moderatorProfile.appointed_at,
    appointedAt,
  );

  // Validate moderation permissions structure
  TestValidator.predicate(
    "moderation permissions object exists",
    !!(
      moderatorProfile.moderation_permissions &&
      typeof moderatorProfile.moderation_permissions === "object"
    ),
  );

  const permissions = moderatorProfile.moderation_permissions;
  TestValidator.predicate(
    "can remove posts permission",
    permissions.can_remove_posts,
  );
  TestValidator.predicate(
    "can remove comments permission",
    permissions.can_remove_comments,
  );
  TestValidator.predicate(
    "can ban users permission",
    permissions.can_ban_users,
  );
  TestValidator.predicate(
    "can warn users permission",
    permissions.can_warn_users,
  );
  TestValidator.predicate(
    "can pin posts permission",
    permissions.can_pin_posts,
  );
  TestValidator.predicate(
    "cannot edit rules permission",
    !permissions.can_edit_rules,
  );
  TestValidator.predicate(
    "cannot manage moderators permission",
    !permissions.can_manage_moderators,
  );
  TestValidator.predicate(
    "can approve posts permission",
    permissions.can_approve_posts,
  );

  // Validate assigned communities
  const assignedCommunities = JSON.parse(moderatorProfile.assigned_communities);
  TestValidator.equals(
    "assigned communities count",
    assignedCommunities.length,
    3,
  );
  TestValidator.equals(
    "community 1 assigned",
    assignedCommunities[0],
    "community-1",
  );
  TestValidator.equals(
    "community 2 assigned",
    assignedCommunities[1],
    "community-2",
  );
  TestValidator.equals(
    "community 3 assigned",
    assignedCommunities[2],
    "community-3",
  );

  // Validate inherited user capabilities (user profile)
  if (moderatorProfile.user) {
    const userProfile = moderatorProfile.user;
    TestValidator.predicate(
      "user profile exists",
      !!(userProfile.id && userProfile.username),
    );
    TestValidator.predicate(
      "user has karma score",
      typeof userProfile.karma_score === "number",
    );
    TestValidator.predicate(
      "user has account status",
      !!userProfile.account_status,
    );
    TestValidator.predicate(
      "user has email verification status",
      typeof userProfile.email_verified === "boolean",
    );
    TestValidator.predicate(
      "user has account creation timestamp",
      !!userProfile.account_created,
    );
  }

  // Validate tracking fields
  TestValidator.predicate(
    "last moderation action timestamp exists",
    !!moderatorProfile.last_moderation_action,
  );
  TestValidator.predicate(
    "moderation score is undefined for new moderator",
    !moderatorProfile.moderation_score,
  );

  // Validate record timestamps
  TestValidator.predicate(
    "record has creation timestamp",
    !!moderatorProfile.created_at,
  );
  TestValidator.predicate(
    "record has update timestamp",
    !!moderatorProfile.updated_at,
  );

  // Verify moderator inherits registered user capabilities
  // The response should contain both user context and moderator-specific enhancements
  TestValidator.predicate(
    "response includes user context",
    !!moderatorProfile.user,
  );
  TestValidator.predicate(
    "response includes moderation permissions",
    !!moderatorProfile.moderation_permissions,
  );
  TestValidator.predicate(
    "response includes assigned communities",
    !!moderatorProfile.assigned_communities,
  );

  // Verify token is automatically set in connection for subsequent calls
  TestValidator.predicate(
    "connection has authorization header",
    !!connection.headers?.Authorization,
  );
  TestValidator.equals(
    "authorization header matches access token",
    connection.headers?.Authorization,
    `Bearer ${authToken.access}`,
  );
}
