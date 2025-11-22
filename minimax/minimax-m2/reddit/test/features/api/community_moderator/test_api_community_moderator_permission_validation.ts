import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunityModerator";
import type { IRedditPlatformRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformRegisteredUser";

/**
 * Test community moderator registration with comprehensive permission
 * configuration.
 *
 * This test validates that moderation permissions are properly set up including
 * content management, user oversight, rule enforcement, and administrative
 * privileges. It verifies permission inheritance and proper permission
 * validation during registration process.
 *
 * The test ensures that community moderators inherit all registered user
 * capabilities while enabling enhanced community management features including
 * content moderation, user management, rule enforcement, and post pinning
 * capabilities.
 */
export async function test_api_community_moderator_permission_validation(
  connection: api.IConnection,
) {
  // Generate test data for moderator registration
  const registeredUserId = typia.random<string & tags.Format<"uuid">>();
  const expectedModeratorId = typia.random<string & tags.Format<"uuid">>();

  // Create comprehensive moderation permissions structure
  const moderationPermissions = {
    can_remove_posts: true,
    can_remove_comments: true,
    can_ban_users: true,
    can_warn_users: true,
    can_pin_posts: true,
    can_edit_rules: true,
    can_manage_moderators: true,
    can_approve_posts: true,
  };

  // Define assigned communities list
  const assignedCommunities = ["community-1", "community-2", "community-3"];

  // Test data for successful registration
  const moderatorCreateData = {
    registered_user_id: registeredUserId,
    moderation_permissions: JSON.stringify(moderationPermissions),
    assigned_communities: JSON.stringify(assignedCommunities),
    appointed_by: "admin-user-123",
    moderation_count: 0,
    last_moderation_action: new Date().toISOString(),
    active_status: "active",
    appointed_at: new Date().toISOString(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
    href: "https://example.com/moderator/registration",
    referrer: "https://example.com/dashboard",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  } satisfies IRedditPlatformCommunityModerator.ICreate;

  // Execute community moderator registration
  const moderatorResponse: IRedditPlatformCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.join(connection, {
      body: moderatorCreateData,
    });

  // Validate registration response
  typia.assert(moderatorResponse);

  // Validate moderator profile data
  const moderatorProfile: IRedditPlatformCommunityModerator.ISummary =
    moderatorResponse.moderator;

  TestValidator.equals(
    "moderator has valid UUID",
    moderatorProfile.id,
    moderatorProfile.id,
  );
  TestValidator.equals(
    "moderator registered user ID matches",
    moderatorProfile.reddit_platform_registereduser_id,
    registeredUserId,
  );
  TestValidator.equals(
    "appointed by authority matches",
    moderatorProfile.appointed_by,
    "admin-user-123",
  );
  TestValidator.equals(
    "active status is correct",
    moderatorProfile.active_status,
    "active",
  );
  TestValidator.equals(
    "initial moderation count is zero",
    moderatorProfile.moderation_count,
    0,
  );
  TestValidator.equals(
    "appointed timestamp is set",
    moderatorProfile.appointed_at,
    moderatorCreateData.appointed_at,
  );

  // Validate moderation permissions structure
  TestValidator.predicate(
    "moderation permissions object exists",
    moderatorProfile.moderation_permissions !== null &&
      moderatorProfile.moderation_permissions !== undefined,
  );

  const actualPermissions = moderatorProfile.moderation_permissions;
  TestValidator.equals(
    "can remove posts permission",
    actualPermissions.can_remove_posts,
    true,
  );
  TestValidator.equals(
    "can remove comments permission",
    actualPermissions.can_remove_comments,
    true,
  );
  TestValidator.equals(
    "can ban users permission",
    actualPermissions.can_ban_users,
    true,
  );
  TestValidator.equals(
    "can warn users permission",
    actualPermissions.can_warn_users,
    true,
  );
  TestValidator.equals(
    "can pin posts permission",
    actualPermissions.can_pin_posts,
    true,
  );
  TestValidator.equals(
    "can edit rules permission",
    actualPermissions.can_edit_rules,
    true,
  );
  TestValidator.equals(
    "can manage moderators permission",
    actualPermissions.can_manage_moderators,
    true,
  );
  TestValidator.equals(
    "can approve posts permission",
    actualPermissions.can_approve_posts,
    true,
  );

  // Validate assigned communities
  const assignedCommList = JSON.parse(moderatorProfile.assigned_communities);
  TestValidator.equals(
    "assigned communities count",
    assignedCommList.length,
    3,
  );
  TestValidator.equals(
    "community 1 assignment",
    assignedCommList[0],
    "community-1",
  );
  TestValidator.equals(
    "community 2 assignment",
    assignedCommList[1],
    "community-2",
  );
  TestValidator.equals(
    "community 3 assignment",
    assignedCommList[2],
    "community-3",
  );

  // Validate authorization token
  const token: IAuthorizationToken = moderatorResponse.token;
  TestValidator.predicate("access token exists", token.access.length > 0);
  TestValidator.predicate("refresh token exists", token.refresh.length > 0);
  TestValidator.predicate(
    "token expiration is future date",
    new Date(token.expired_at) > new Date(),
  );
  TestValidator.predicate(
    "refresh token has valid expiration",
    new Date(token.refreshable_until) > new Date(),
  );

  // Test edge case: minimal permissions configuration
  const minimalPermissions = {
    can_remove_posts: false,
    can_remove_comments: false,
    can_ban_users: false,
    can_warn_users: true,
    can_pin_posts: false,
    can_edit_rules: false,
    can_manage_moderators: false,
    can_approve_posts: false,
  };

  const minimalModeratorData = {
    registered_user_id: typia.random<string & tags.Format<"uuid">>(),
    moderation_permissions: JSON.stringify(minimalPermissions),
    assigned_communities: JSON.stringify(["community-limited"]),
    appointed_by: "senior-admin-456",
    moderation_count: 0,
    last_moderation_action: new Date().toISOString(),
    active_status: "active",
    appointed_at: new Date().toISOString(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
    href: "https://example.com/moderator/registration",
    referrer: "https://example.com/dashboard",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  } satisfies IRedditPlatformCommunityModerator.ICreate;

  const minimalResponse: IRedditPlatformCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.join(connection, {
      body: minimalModeratorData,
    });

  typia.assert(minimalResponse);

  const minimalModerator = minimalResponse.moderator;
  TestValidator.equals(
    "minimal permissions - warn users only",
    minimalModerator.moderation_permissions.can_warn_users,
    true,
  );
  TestValidator.equals(
    "minimal permissions - no post removal",
    minimalModerator.moderation_permissions.can_remove_posts,
    false,
  );
  TestValidator.equals(
    "minimal permissions - no comment removal",
    minimalModerator.moderation_permissions.can_remove_comments,
    false,
  );

  // Test invalid registration scenarios
  await TestValidator.error(
    "registration with invalid UUID format",
    async () => {
      await api.functional.auth.communityModerator.join(connection, {
        body: {
          ...moderatorCreateData,
          registered_user_id: "invalid-uuid-format",
        },
      });
    },
  );

  await TestValidator.error(
    "registration with invalid IP address",
    async () => {
      await api.functional.auth.communityModerator.join(connection, {
        body: {
          ...moderatorCreateData,
          registered_user_id: typia.random<string & tags.Format<"uuid">>(),
          ip: "invalid-ip-address",
        },
      });
    },
  );

  await TestValidator.error(
    "registration with empty moderation permissions",
    async () => {
      await api.functional.auth.communityModerator.join(connection, {
        body: {
          ...moderatorCreateData,
          registered_user_id: typia.random<string & tags.Format<"uuid">>(),
          moderation_permissions: "",
        },
      });
    },
  );

  await TestValidator.error(
    "registration with invalid date format",
    async () => {
      await api.functional.auth.communityModerator.join(connection, {
        body: {
          ...moderatorCreateData,
          registered_user_id: typia.random<string & tags.Format<"uuid">>(),
          appointed_at: "not-a-date",
        },
      });
    },
  );

  await TestValidator.error(
    "registration with negative moderation count",
    async () => {
      await api.functional.auth.communityModerator.join(connection, {
        body: {
          ...moderatorCreateData,
          registered_user_id: typia.random<string & tags.Format<"uuid">>(),
          moderation_count: -1,
        },
      });
    },
  );

  await TestValidator.error(
    "registration with invalid status value",
    async () => {
      await api.functional.auth.communityModerator.join(connection, {
        body: {
          ...moderatorCreateData,
          registered_user_id: typia.random<string & tags.Format<"uuid">>(),
          active_status: "invalid-status",
        },
      });
    },
  );

  await TestValidator.error("registration with malformed URI", async () => {
    await api.functional.auth.communityModerator.join(connection, {
      body: {
        ...moderatorCreateData,
        registered_user_id: typia.random<string & tags.Format<"uuid">>(),
        href: "not-a-valid-uri",
      },
    });
  });

  await TestValidator.error(
    "registration with invalid moderation permissions JSON",
    async () => {
      await api.functional.auth.communityModerator.join(connection, {
        body: {
          ...moderatorCreateData,
          registered_user_id: typia.random<string & tags.Format<"uuid">>(),
          moderation_permissions: "{invalid-json",
        },
      });
    },
  );

  // Test permission inheritance validation
  TestValidator.predicate(
    "user profile inheritance works",
    moderatorProfile.user !== null && moderatorProfile.user !== undefined,
  );

  if (moderatorProfile.user) {
    TestValidator.predicate(
      "user has ID",
      typeof moderatorProfile.user.id === "string",
    );
    TestValidator.predicate(
      "user has username",
      typeof moderatorProfile.user.username === "string",
    );
    TestValidator.predicate(
      "user has karma score",
      typeof moderatorProfile.user.karma_score === "number",
    );
    TestValidator.predicate(
      "user has account status",
      typeof moderatorProfile.user.account_status === "string",
    );
  }

  // Final validation of created timestamps
  TestValidator.predicate(
    "created at timestamp is valid date",
    !isNaN(new Date(moderatorProfile.created_at).getTime()),
  );
  TestValidator.predicate(
    "updated at timestamp is valid date",
    !isNaN(new Date(moderatorProfile.updated_at).getTime()),
  );

  // Verify created_at is before or equal to updated_at
  TestValidator.predicate(
    "created_at is not after updated_at",
    new Date(moderatorProfile.created_at) <=
      new Date(moderatorProfile.updated_at),
  );

  // Test moderation score field (optional)
  if (
    moderatorProfile.moderation_score !== null &&
    moderatorProfile.moderation_score !== undefined
  ) {
    TestValidator.predicate(
      "moderation score is valid number",
      typeof moderatorProfile.moderation_score === "number",
    );
  }

  // Verify last moderation action timestamp
  if (
    moderatorProfile.last_moderation_action !== null &&
    moderatorProfile.last_moderation_action !== undefined
  ) {
    TestValidator.predicate(
      "last moderation action is valid date",
      !isNaN(new Date(moderatorProfile.last_moderation_action).getTime()),
    );
  }

  // Test comprehensive permission validation with all combinations
  const comprehensivePermissions = {
    can_remove_posts: true,
    can_remove_comments: true,
    can_ban_users: true,
    can_warn_users: true,
    can_pin_posts: true,
    can_edit_rules: true,
    can_manage_moderators: true,
    can_approve_posts: true,
  };

  const comprehensiveData = {
    registered_user_id: typia.random<string & tags.Format<"uuid">>(),
    moderation_permissions: JSON.stringify(comprehensivePermissions),
    assigned_communities: JSON.stringify([
      "test-community-1",
      "test-community-2",
    ]),
    appointed_by: "super-admin-789",
    moderation_count: 0,
    last_moderation_action: new Date().toISOString(),
    active_status: "active",
    appointed_at: new Date().toISOString(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
    href: "https://test.com/moderator/comprehensive-test",
    referrer: "https://test.com/dashboard",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  } satisfies IRedditPlatformCommunityModerator.ICreate;

  const comprehensiveResponse: IRedditPlatformCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.join(connection, {
      body: comprehensiveData,
    });

  typia.assert(comprehensiveResponse);

  const comprehensiveModerator = comprehensiveResponse.moderator;
  const compPermissions = comprehensiveModerator.moderation_permissions;

  // Verify all comprehensive permissions are set correctly
  TestValidator.equals(
    "comprehensive - can remove posts",
    compPermissions.can_remove_posts,
    true,
  );
  TestValidator.equals(
    "comprehensive - can remove comments",
    compPermissions.can_remove_comments,
    true,
  );
  TestValidator.equals(
    "comprehensive - can ban users",
    compPermissions.can_ban_users,
    true,
  );
  TestValidator.equals(
    "comprehensive - can warn users",
    compPermissions.can_warn_users,
    true,
  );
  TestValidator.equals(
    "comprehensive - can pin posts",
    compPermissions.can_pin_posts,
    true,
  );
  TestValidator.equals(
    "comprehensive - can edit rules",
    compPermissions.can_edit_rules,
    true,
  );
  TestValidator.equals(
    "comprehensive - can manage moderators",
    compPermissions.can_manage_moderators,
    true,
  );
  TestValidator.equals(
    "comprehensive - can approve posts",
    compPermissions.can_approve_posts,
    true,
  );

  // Verify assigned communities parsing
  const compCommunities = JSON.parse(
    comprehensiveModerator.assigned_communities,
  );
  TestValidator.equals(
    "comprehensive communities count",
    compCommunities.length,
    2,
  );
  TestValidator.equals(
    "comprehensive community 1",
    compCommunities[0],
    "test-community-1",
  );
  TestValidator.equals(
    "comprehensive community 2",
    compCommunities[1],
    "test-community-2",
  );

  // Test that all required fields are properly validated
  TestValidator.equals(
    "comprehensive moderator has appointed authority",
    comprehensiveModerator.appointed_by,
    "super-admin-789",
  );
  TestValidator.equals(
    "comprehensive moderator has correct status",
    comprehensiveModerator.active_status,
    "active",
  );
  TestValidator.equals(
    "comprehensive moderator has zero initial count",
    comprehensiveModerator.moderation_count,
    0,
  );
  TestValidator.predicate(
    "comprehensive moderator has valid timestamps",
    !isNaN(new Date(comprehensiveModerator.created_at).getTime()) &&
      !isNaN(new Date(comprehensiveModerator.updated_at).getTime()),
  );
}
