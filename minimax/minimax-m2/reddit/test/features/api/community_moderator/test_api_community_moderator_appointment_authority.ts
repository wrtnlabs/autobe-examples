import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunityModerator";
import type { IRedditPlatformRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformRegisteredUser";

export async function test_api_community_moderator_appointment_authority(
  connection: api.IConnection,
) {
  // Generate unique identifiers for test users and data
  const registeredUserId = typia.random<string & tags.Format<"uuid">>();
  const appointedByUserId = typia.random<string & tags.Format<"uuid">>();
  const moderatorId = typia.random<string & tags.Format<"uuid">>();
  const currentTimestamp = new Date().toISOString();

  // Create moderation permissions JSON
  const moderationPermissions = JSON.stringify({
    can_remove_posts: true,
    can_remove_comments: true,
    can_ban_users: true,
    can_warn_users: true,
    can_pin_posts: false,
    can_edit_rules: false,
    can_manage_moderators: false,
    can_approve_posts: true,
  });

  // Create assigned communities JSON
  const assignedCommunities = JSON.stringify(["community-1", "community-2"]);

  // Create the community moderator with proper appointment authority
  const moderatorCreationRequest = {
    registered_user_id: registeredUserId,
    moderation_permissions: moderationPermissions,
    assigned_communities: assignedCommunities,
    appointed_by: appointedByUserId,
    moderation_count: 0,
    last_moderation_action: currentTimestamp,
    active_status: "active",
    appointed_at: currentTimestamp,
    ip: typia.random<string & tags.Format<"ipv4">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    created_at: currentTimestamp,
    updated_at: currentTimestamp,
  };

  // Execute the moderator creation API call - FIXED: Added await keyword
  const moderatorResponse: IRedditPlatformCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.join(connection, {
      body: moderatorCreationRequest satisfies IRedditPlatformCommunityModerator.ICreate,
    });

  // Validate the response using typia assertion for type safety
  typia.assert(moderatorResponse);

  // Validate the appointed_by field was correctly recorded
  TestValidator.equals(
    "appointed_by authority correctly recorded",
    moderatorResponse.moderator.appointed_by,
    appointedByUserId,
  );

  // Validate appointment timestamp was recorded
  TestValidator.equals(
    "appointment timestamp recorded",
    moderatorResponse.moderator.appointed_at,
    currentTimestamp,
  );

  // Validate moderator status is active
  TestValidator.equals(
    "moderator status is active",
    moderatorResponse.moderator.active_status,
    "active",
  );

  // Validate moderation count starts at 0
  TestValidator.equals(
    "initial moderation count is 0",
    moderatorResponse.moderator.moderation_count,
    0,
  );

  // Validate moderation permissions structure
  TestValidator.predicate(
    "moderation permissions structure is valid",
    moderatorResponse.moderator.moderation_permissions.can_remove_posts ===
      true &&
      moderatorResponse.moderator.moderation_permissions.can_ban_users ===
        true &&
      moderatorResponse.moderator.moderation_permissions.can_approve_posts ===
        true,
  );

  // Validate assigned communities were recorded
  TestValidator.predicate(
    "assigned communities properly tracked",
    typeof moderatorResponse.moderator.assigned_communities === "string" &&
      moderatorResponse.moderator.assigned_communities.length > 0,
  );

  // Validate the moderator has a valid UUID
  TestValidator.predicate(
    "moderator ID is valid UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      moderatorResponse.moderator.id,
    ),
  );

  // Validate authorization token was generated
  TestValidator.predicate(
    "authorization token generated",
    moderatorResponse.token.access.length > 0 &&
      moderatorResponse.token.refresh.length > 0,
  );

  // Validate token expiration times are properly set
  TestValidator.predicate(
    "token expiration times are valid",
    typeof moderatorResponse.token.expired_at === "string" &&
      typeof moderatorResponse.token.refreshable_until === "string",
  );

  // Validate the appointment created a complete audit trail
  TestValidator.predicate(
    "complete audit trail established",
    moderatorResponse.moderator.appointed_by === appointedByUserId &&
      moderatorResponse.moderator.appointed_at === currentTimestamp &&
      moderatorResponse.moderator.created_at === currentTimestamp &&
      moderatorResponse.moderator.updated_at === currentTimestamp,
  );
}
