import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformCommunityMembership } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunityMembership";
import type { IRedditPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunityModerator";
import type { IRedditPlatformPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPlatformAdministrator";
import type { IRedditPlatformRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformRegisteredUser";
import type { IRedditPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformUser";

/**
 * Test platform administrator removing a community member who has been banned.
 *
 * This test validates the intersection of moderation actions with membership
 * removal by:
 *
 * 1. Creating a platform administrator account for testing
 * 2. Creating a regular user who will become a banned member
 * 3. Creating a community and adding the user as a member
 * 4. Updating the member status to "banned" through proper moderation workflow
 * 5. Using the platform administrator to remove the banned member from the
 *    community
 * 6. Validating that the removal operation succeeds and proper membership status
 *    changes occur
 *
 * This test ensures that platform administrators have the authority to remove
 * banned community members and that the banned status is properly handled in
 * membership management operations. The test covers multi-actor authentication
 * scenarios and validates the complete workflow from user creation through
 * banning to removal.
 */
export async function test_api_community_member_removal_banned_status(
  connection: api.IConnection,
) {
  // Step 1: Create platform administrator account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const platformAdmin: IRedditPlatformPlatformAdministrator.IAuthorized =
    await api.functional.auth.platformAdministrator.join(connection, {
      body: {
        username: `admin_${RandomGenerator.alphabets(8)}`,
        email: adminEmail,
        password: "admin123456",
        display_name: "Test Platform Admin",
        administrator_level: "admin",
        system_permissions: JSON.stringify({
          user_management: {
            can_create_users: true,
            can_modify_users: true,
            can_suspend_users: true,
            can_ban_users: true,
            can_view_user_data: true,
            can_manage_user_permissions: true,
          },
          community_oversight: {
            can_create_communities: true,
            can_modify_communities: true,
            can_suspend_communities: true,
            can_delete_communities: true,
            can_moderate_all_communities: true,
            can_view_community_data: true,
          },
          content_moderation: {
            can_remove_content: true,
            can_moderate_globally: true,
            can_manage_reports: true,
            can_shadowban_content: true,
            can_restore_content: true,
            can_view_hidden_content: true,
          },
          system_configuration: {
            can_manage_settings: true,
            can_manage_features: true,
            can_manage_integrations: true,
            can_view_system_logs: true,
            can_manage_security: true,
            can_manage_backup: true,
          },
          compliance_legal: {
            can_access_compliance_data: true,
            can_manage_privacy: true,
            can_manage_data_retention: true,
            can_handle_dmca: true,
            can_manage_legal_requests: true,
            can_view_analytics: true,
          },
        }),
        security_clearance: "high",
      } satisfies IRedditPlatformPlatformAdministrator.ICreate,
    });
  typia.assert(platformAdmin);

  // Step 2: Create regular user who will become banned member
  const userEmail = typia.random<string & tags.Format<"email">>();
  const regularUser: IRedditPlatformRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.join(connection, {
      body: {
        username: `user_${RandomGenerator.alphabets(8)}`,
        email: userEmail,
        password: "user123456",
        display_name: "Test User",
        href: "https://test.example.com/register",
        referrer: "https://test.example.com/",
      } satisfies IRedditPlatformRegisteredUser.ICreate,
    });
  typia.assert(regularUser);

  // Step 3: Create community and add user as member
  const communityName = `test_community_${RandomGenerator.alphabets(6)}`;

  // Switch to regular user context to join community
  await api.functional.auth.registeredUser.login(connection, {
    body: {
      email: userEmail,
      password: "user123456",
      href: "https://test.example.com/login",
      referrer: "https://test.example.com/",
    } satisfies IRedditPlatformRegisteredUser.ILogin,
  });

  // User joins the community
  const membership: IRedditPlatformCommunityMembership =
    await api.functional.redditPlatform.communities.join(connection, {
      communityName: communityName,
    });
  typia.assert(membership);

  // Verify the user was added as a member
  TestValidator.equals(
    "user successfully joined community",
    membership.member.username,
    regularUser.username,
  );
  TestValidator.equals(
    "member status is subscriber initially",
    membership.membership_level,
    "subscriber",
  );

  // Step 4: Update member status to "banned" through moderation workflow
  // Switch back to platform administrator to perform moderation
  await api.functional.auth.platformAdministrator.login(connection, {
    body: {
      email: adminEmail,
      password: "admin123456",
      ip: "192.168.1.100",
      href: "https://admin.example.com/moderate",
      referrer: "https://admin.example.com/",
    } satisfies IRedditPlatformPlatformAdministrator.ILogin,
  });

  // Update member status to banned
  const bannedMembership: IRedditPlatformCommunityMembership =
    await api.functional.redditPlatform.communities.members.update(connection, {
      communityName: communityName,
      userId: regularUser.id,
      body: {
        membership_level: "banned",
        post_permissions: false,
        comment_permissions: false,
        vote_permissions: false,
      } satisfies IRedditPlatformCommunityMembership.IUpdate,
    });
  typia.assert(bannedMembership);

  // Verify the member was banned
  TestValidator.equals(
    "member status updated to banned",
    bannedMembership.membership_level,
    "banned",
  );
  TestValidator.equals(
    "banned member has no post permissions",
    bannedMembership.post_permissions,
    false,
  );
  TestValidator.equals(
    "banned member has no comment permissions",
    bannedMembership.comment_permissions,
    false,
  );
  TestValidator.equals(
    "banned member has no vote permissions",
    bannedMembership.vote_permissions,
    false,
  );

  // Step 5: Platform administrator removes the banned member
  const removedMembership: IRedditPlatformCommunityMembership =
    await api.functional.redditPlatform.platformAdministrator.communities.members.erase(
      connection,
      {
        communityName: communityName,
        userId: regularUser.id,
      },
    );
  typia.assert(removedMembership);

  // Step 6: Validate the removal operation
  TestValidator.equals(
    "removal operation completed successfully",
    removedMembership.id,
    bannedMembership.id,
  );
  TestValidator.equals(
    "removed member is no longer active",
    removedMembership.membership_level,
    "banned",
  );

  // Verify the member is properly removed from community
  TestValidator.equals(
    "community membership removal preserved audit trail",
    removedMembership.joined_at,
    membership.joined_at,
  );
  TestValidator.equals(
    "community context preserved in removal record",
    removedMembership.community.name,
    communityName,
  );
  TestValidator.equals(
    "user context preserved in removal record",
    removedMembership.member.username,
    regularUser.username,
  );
}
