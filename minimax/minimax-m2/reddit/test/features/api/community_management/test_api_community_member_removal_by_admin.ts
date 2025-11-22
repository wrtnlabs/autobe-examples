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

export async function test_api_community_member_removal_by_admin(
  connection: api.IConnection,
) {
  // Generate unique identifiers for test accounts
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const userEmail = typia.random<string & tags.Format<"email">>();
  const communityName = `test_community_${RandomGenerator.alphaNumeric(8)}`;

  // Step 1: Create platform administrator account
  const platformAdmin = await api.functional.auth.platformAdministrator.join(
    connection,
    {
      body: {
        username: RandomGenerator.alphabets(12),
        email: adminEmail,
        password: "AdminPass123!",
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
    },
  );
  typia.assert(platformAdmin);

  // Step 2: Create regular registered user account
  const regularUser = await api.functional.auth.registeredUser.join(
    connection,
    {
      body: {
        username: RandomGenerator.alphabets(10),
        email: userEmail,
        password: "UserPass123!",
        display_name: "Test Regular User",
        bio: "Regular test user for community participation",
        href: "https://test.example.com/register",
        referrer: "https://test.example.com/home",
      } satisfies IRedditPlatformRegisteredUser.ICreate,
    },
  );
  typia.assert(regularUser);

  // Step 3: Register the user in the community to create membership
  const membership =
    await api.functional.redditPlatform.communities.members.create(connection, {
      communityName: communityName,
      userId: regularUser.id,
      body: {
        membership_level: "member",
        post_permissions: true,
        comment_permissions: true,
        vote_permissions: true,
      } satisfies IRedditPlatformCommunityMembership.ICreate,
    });
  typia.assert(membership);

  // Verify the membership was created successfully
  TestValidator.equals(
    "membership created successfully",
    membership.membership_level,
    "member",
  );
  TestValidator.equals(
    "community name matches",
    membership.community.name,
    communityName,
  );
  TestValidator.equals(
    "member ID matches",
    membership.member.id,
    regularUser.id,
  );

  // Step 4: Platform administrator removes the community member
  const removalResult =
    await api.functional.redditPlatform.platformAdministrator.communities.members.erase(
      connection,
      {
        communityName: communityName,
        userId: regularUser.id,
      },
    );
  typia.assert(removalResult);

  // Step 5: Validate the removal operation
  TestValidator.equals(
    "removal operation completed",
    removalResult.membership_level,
    "banned",
  );
  TestValidator.equals(
    "community still exists",
    removalResult.community.name,
    communityName,
  );
  TestValidator.equals(
    "user record preserved",
    removalResult.member.id,
    regularUser.id,
  );

  // Step 6: Verify authorization boundaries - ensure member status reflects removal
  TestValidator.predicate(
    "user membership status updated to banned",
    removalResult.membership_level === "banned",
  );

  // Additional verification: the user should no longer have active permissions
  TestValidator.predicate(
    "member removed from active participation",
    removalResult.post_permissions === false &&
      removalResult.comment_permissions === false &&
      removalResult.vote_permissions === false,
  );

  // Test completion - platform administrator successfully removed community member
  TestValidator.equals(
    "admin member removal test completed successfully",
    true,
    true,
  );
}
