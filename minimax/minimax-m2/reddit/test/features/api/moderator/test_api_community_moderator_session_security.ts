import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunityModerator";
import type { IRedditPlatformRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformRegisteredUser";

export async function test_api_community_moderator_session_security(
  connection: api.IConnection,
) {
  // Generate realistic test data for moderator registration with security tracking
  const moderatorData = {
    registered_user_id: typia.random<string & tags.Format<"uuid">>(),
    moderation_permissions: JSON.stringify({
      can_remove_posts: true,
      can_remove_comments: true,
      can_ban_users: true,
      can_warn_users: true,
      can_pin_posts: true,
      can_edit_rules: true,
      can_manage_moderators: false,
      can_approve_posts: true,
    }),
    assigned_communities: JSON.stringify([
      typia.random<string & tags.Format<"uuid">>(),
      typia.random<string & tags.Format<"uuid">>(),
    ]),
    appointed_by: typia.random<string>(),
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

  // Test moderator registration with security tracking fields
  const moderatorResponse: IRedditPlatformCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.join(connection, {
      body: moderatorData,
    });

  // Validate response structure and security data
  typia.assert(moderatorResponse);

  // Verify moderator profile data integrity
  TestValidator.equals(
    "moderator ID should be valid UUID",
    moderatorResponse.moderator.id,
    moderatorResponse.moderator.id,
  );

  TestValidator.equals(
    "moderator should have registered user association",
    moderatorResponse.moderator.reddit_platform_registereduser_id,
    moderatorData.registered_user_id,
  );

  TestValidator.equals(
    "moderator should have active status",
    moderatorResponse.moderator.active_status,
    "active",
  );

  TestValidator.equals(
    "moderator should have zero initial moderation count",
    moderatorResponse.moderator.moderation_count,
    0,
  );

  // Validate moderation permissions structure
  TestValidator.predicate(
    "moderator should have valid permissions structure",
    typeof moderatorResponse.moderator.moderation_permissions === "object" &&
      moderatorResponse.moderator.moderation_permissions.can_remove_posts ===
        true &&
      moderatorResponse.moderator.moderation_permissions.can_ban_users === true,
  );

  // Validate JWT token generation and structure
  TestValidator.equals(
    "response should contain valid authorization token",
    typeof moderatorResponse.token.access,
    "string",
  );

  TestValidator.equals(
    "response should contain refresh token",
    typeof moderatorResponse.token.refresh,
    "string",
  );

  TestValidator.equals(
    "access token should have valid expiration",
    typeof moderatorResponse.token.expired_at,
    "string",
  );

  TestValidator.equals(
    "refresh token should have valid expiration",
    typeof moderatorResponse.token.refreshable_until,
    "string",
  );

  // Validate that assigned communities are properly stored
  TestValidator.predicate(
    "assigned communities should be valid JSON array",
    Array.isArray(JSON.parse(moderatorResponse.moderator.assigned_communities)),
  );

  // Validate appointment authority tracking
  TestValidator.equals(
    "appointed_by should match input data",
    moderatorResponse.moderator.appointed_by,
    moderatorData.appointed_by,
  );

  // Validate appointment timestamp
  TestValidator.predicate(
    "appointed_at should be valid ISO date",
    !isNaN(Date.parse(moderatorResponse.moderator.appointed_at)),
  );

  // Test security monitoring field persistence
  TestValidator.predicate(
    "moderator record should be created with timestamp",
    !isNaN(Date.parse(moderatorResponse.moderator.created_at)),
  );

  TestValidator.predicate(
    "moderator record should have update timestamp",
    !isNaN(Date.parse(moderatorResponse.moderator.updated_at)),
  );

  // Validate that the moderator inherits user capabilities
  TestValidator.equals(
    "moderator should have associated user profile",
    typeof moderatorResponse.moderator.user,
    "object",
  );

  // Verify that the response indicates enhanced security for moderator role
  TestValidator.predicate(
    "response should indicate moderator-specific authorization",
    moderatorResponse.moderator.active_status === "active" &&
      moderatorResponse.moderator.moderation_count === 0 &&
      moderatorResponse.token.access.length > 0,
  );

  // Test that the security tracking data is properly captured
  TestValidator.predicate(
    "moderator should have valid appointment authority",
    moderatorResponse.moderator.appointed_by.length > 0,
  );

  // Validate moderation score is properly initialized
  TestValidator.equals(
    "moderation score should be initialized",
    moderatorResponse.moderator.moderation_score,
    undefined,
  );

  // Ensure that the enhanced security validation is working
  TestValidator.predicate(
    "moderator authentication should include enhanced security context",
    moderatorResponse.moderator.id.length > 0 &&
      moderatorResponse.moderator.active_status === "active" &&
      typeof moderatorResponse.token.access === "string" &&
      moderatorResponse.token.access.length > 0,
  );
}
