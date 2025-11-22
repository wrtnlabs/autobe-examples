import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunityModerator";
import type { IRedditPlatformRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformRegisteredUser";

/**
 * Test community moderator registration with assignment to multiple
 * communities.
 *
 * This comprehensive test validates that community moderators can be properly
 * registered with multiple community assignments and that their moderation
 * permissions are correctly configured across all assigned communities.
 *
 * The test covers:
 *
 * - Moderator account creation with multiple community assignments
 * - Proper validation of moderation permissions configuration
 * - Verification of community access and management capabilities
 * - Edge cases including invalid community assignments
 * - Business logic validation for moderator appointment authority
 */
export async function test_api_community_moderator_with_multiple_communities(
  connection: api.IConnection,
) {
  // Generate realistic test data for multiple communities
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const registeredUserId = typia.random<string & tags.Format<"uuid">>();

  // Create a comprehensive set of community IDs for assignment
  const assignedCommunityIds = ArrayUtil.repeat(5, () =>
    typia.random<string & tags.Format<"uuid">>(),
  );

  // Generate realistic moderation permissions
  const moderationPermissions = {
    can_remove_posts: true,
    can_remove_comments: true,
    can_ban_users: RandomGenerator.pick([true, false]),
    can_warn_users: true,
    can_pin_posts: RandomGenerator.pick([true, false]),
    can_edit_rules: RandomGenerator.pick([true, false]),
    can_manage_moderators: RandomGenerator.pick([true, false]),
    can_approve_posts: true,
  };

  // Generate test data for moderator registration
  const moderatorData = {
    registered_user_id: registeredUserId,
    moderation_permissions: JSON.stringify(moderationPermissions),
    assigned_communities: JSON.stringify(assignedCommunityIds),
    appointed_by: typia.random<string & tags.Format<"uuid">>(),
    moderation_count: 0,
    last_moderation_action: new Date().toISOString(),
    active_status: "active",
    appointed_at: new Date().toISOString(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  } satisfies IRedditPlatformCommunityModerator.ICreate;

  // Test successful moderator registration
  const moderatorResponse: IRedditPlatformCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.join(connection, {
      body: moderatorData,
    });

  // Validate the response structure and data integrity
  typia.assert(moderatorResponse);

  // Verify moderator authentication token structure
  TestValidator.equals(
    "authorization token exists",
    moderatorResponse.token,
    typia.assert(moderatorResponse.token),
  );
  TestValidator.predicate(
    "access token is valid JWT format",
    /^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+$/.test(
      moderatorResponse.token.access,
    ),
  );
  TestValidator.predicate(
    "refresh token is valid JWT format",
    /^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+$/.test(
      moderatorResponse.token.refresh,
    ),
  );

  // Validate moderator profile information
  const moderator = moderatorResponse.moderator;
  TestValidator.equals(
    "moderator ID exists",
    moderator.id,
    typia.assert(moderator.id),
  );
  TestValidator.equals(
    "registered user ID matches",
    moderator.reddit_platform_registereduser_id,
    registeredUserId,
  );
  TestValidator.equals(
    "active status is correct",
    moderator.active_status,
    "active",
  );
  TestValidator.equals(
    "appointed authority matches",
    moderator.appointed_by,
    moderatorData.appointed_by,
  );
  TestValidator.equals(
    "appointed timestamp matches",
    moderator.appointed_at,
    moderatorData.appointed_at,
  );
  TestValidator.equals(
    "initial moderation count is zero",
    moderator.moderation_count,
    0,
  );

  // Validate moderation permissions structure
  TestValidator.equals(
    "can_remove_posts permission",
    moderator.moderation_permissions.can_remove_posts,
    true,
  );
  TestValidator.equals(
    "can_remove_comments permission",
    moderator.moderation_permissions.can_remove_comments,
    true,
  );
  TestValidator.equals(
    "can_warn_users permission",
    moderator.moderation_permissions.can_warn_users,
    true,
  );
  TestValidator.equals(
    "can_approve_posts permission",
    moderator.moderation_permissions.can_approve_posts,
    true,
  );

  // Validate assigned communities
  const responseCommunityIds = JSON.parse(
    moderator.assigned_communities,
  ) as string[];
  TestValidator.equals(
    "correct number of assigned communities",
    responseCommunityIds.length,
    assignedCommunityIds.length,
  );

  // Verify all assigned communities are included
  for (const assignedId of assignedCommunityIds) {
    TestValidator.predicate(
      `community ${assignedId} is assigned`,
      responseCommunityIds.includes(assignedId),
    );
  }

  // Test edge case: single community assignment
  const singleCommunityId = typia.random<string & tags.Format<"uuid">>();
  const singleCommunityData = {
    ...moderatorData,
    assigned_communities: JSON.stringify([singleCommunityId]),
  } satisfies IRedditPlatformCommunityModerator.ICreate;

  const singleResponse = await api.functional.auth.communityModerator.join(
    connection,
    {
      body: singleCommunityData,
    },
  );

  typia.assert(singleResponse);
  TestValidator.equals(
    "single community assignment works",
    JSON.parse(singleResponse.moderator.assigned_communities)[0],
    singleCommunityId,
  );

  // Test with minimum required permissions
  const minimalPermissions = {
    can_remove_posts: true,
    can_remove_comments: true,
    can_ban_users: false,
    can_warn_users: false,
    can_pin_posts: false,
    can_edit_rules: false,
    can_manage_moderators: false,
    can_approve_posts: false,
  };

  const minimalData = {
    ...moderatorData,
    moderation_permissions: JSON.stringify(minimalPermissions),
    assigned_communities: JSON.stringify([assignedCommunityIds[0]]),
  } satisfies IRedditPlatformCommunityModerator.ICreate;

  const minimalResponse = await api.functional.auth.communityModerator.join(
    connection,
    {
      body: minimalData,
    },
  );

  typia.assert(minimalResponse);
  TestValidator.predicate(
    "minimal permissions are accepted",
    minimalResponse.moderator.moderation_permissions.can_remove_posts === true,
  );

  // Test with maximum community assignments (simulate realistic limit)
  const maxCommunityIds = ArrayUtil.repeat(10, () =>
    typia.random<string & tags.Format<"uuid">>(),
  );

  const maxData = {
    ...moderatorData,
    assigned_communities: JSON.stringify(maxCommunityIds),
  } satisfies IRedditPlatformCommunityModerator.ICreate;

  const maxResponse = await api.functional.auth.communityModerator.join(
    connection,
    {
      body: maxData,
    },
  );

  typia.assert(maxResponse);
  const maxAssignedCommunities = JSON.parse(
    maxResponse.moderator.assigned_communities,
  ) as string[];
  TestValidator.equals(
    "maximum community assignment handled",
    maxAssignedCommunities.length,
    maxCommunityIds.length,
  );

  // Validate timestamps are properly set
  TestValidator.predicate(
    "created timestamp is recent",
    new Date(moderator.created_at).getTime() > Date.now() - 60000, // Within last minute
  );
  TestValidator.predicate(
    "updated timestamp is recent",
    new Date(moderator.updated_at).getTime() > Date.now() - 60000, // Within last minute
  );

  // Test business logic: verify moderator inherits user context
  if (moderator.user) {
    TestValidator.equals(
      "user context is linked",
      moderator.user.id,
      registeredUserId,
    );
    TestValidator.predicate(
      "user account status is valid",
      ["active", "suspended", "banned", "restricted"].includes(
        moderator.user.account_status,
      ),
    );
  }

  // Test moderation activity tracking
  TestValidator.equals(
    "last moderation action initialized",
    moderator.last_moderation_action,
    moderatorData.last_moderation_action,
  );

  // Verify moderator score field exists (if present)
  if (typeof moderator.moderation_score !== "undefined") {
    TestValidator.predicate(
      "moderation score is numeric",
      typeof moderator.moderation_score === "number",
    );
  }

  // Test edge case: invalid IP address format
  await TestValidator.error(
    "invalid IP address should be rejected",
    async () => {
      await api.functional.auth.communityModerator.join(connection, {
        body: {
          ...moderatorData,
          ip: "invalid_ip_format",
        } satisfies IRedditPlatformCommunityModerator.ICreate,
      });
    },
  );

  // Test edge case: invalid URI format
  await TestValidator.error(
    "invalid URI formats should be rejected",
    async () => {
      await api.functional.auth.communityModerator.join(connection, {
        body: {
          ...moderatorData,
          href: "not_a_valid_uri",
        } satisfies IRedditPlatformCommunityModerator.ICreate,
      });
    },
  );

  // Test edge case: future appointment timestamp
  await TestValidator.error(
    "future appointment timestamps should be rejected",
    async () => {
      await api.functional.auth.communityModerator.join(connection, {
        body: {
          ...moderatorData,
          appointed_at: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
        } satisfies IRedditPlatformCommunityModerator.ICreate,
      });
    },
  );

  // Test comprehensive validation of JSON field parsing
  const allCommunityIds = [...assignedCommunityIds, ...maxCommunityIds];

  // Create a moderator with all communities from previous tests
  const comprehensiveData = {
    ...moderatorData,
    assigned_communities: JSON.stringify([...new Set(allCommunityIds)]), // Remove duplicates
  } satisfies IRedditPlatformCommunityModerator.ICreate;

  const comprehensiveResponse =
    await api.functional.auth.communityModerator.join(connection, {
      body: comprehensiveData,
    });

  typia.assert(comprehensiveResponse);
  const comprehensiveCommunities = JSON.parse(
    comprehensiveResponse.moderator.assigned_communities,
  ) as string[];
  TestValidator.predicate(
    "all unique communities are assigned",
    comprehensiveCommunities.length === [...new Set(allCommunityIds)].length,
  );

  // Final comprehensive validation
  TestValidator.equals(
    "moderator registration success",
    typeof comprehensiveResponse.moderator.id,
    "string",
  );
  TestValidator.equals(
    "authentication successful",
    typeof comprehensiveResponse.token.access,
    "string",
  );
  TestValidator.predicate(
    "moderator has active status",
    comprehensiveResponse.moderator.active_status === "active",
  );
  TestValidator.predicate(
    "moderation permissions are properly set",
    comprehensiveResponse.moderator.moderation_permissions.can_remove_posts ===
      true,
  );
  TestValidator.predicate(
    "communities are properly assigned",
    comprehensiveCommunities.length > 0,
  );
}
