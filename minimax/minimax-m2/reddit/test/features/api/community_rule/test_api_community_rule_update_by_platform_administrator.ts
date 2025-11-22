import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunityModerator";
import type { IRedditPlatformCommunityRule } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunityRule";
import type { IRedditPlatformPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPlatformAdministrator";
import type { IRedditPlatformRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformRegisteredUser";
import type { IRedditPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformUser";

/**
 * Test platform administrator can update community rules with new content,
 * type, priority, or activation status.
 *
 * This test validates the core community governance functionality where
 * platform administrators have the authority to modify community rules across
 * any community. The workflow includes:
 *
 * 1. Create platform administrator account for authentication
 * 2. Create registered user account for community creation
 * 3. Create a test community with the registered user
 * 4. Create initial community rule for testing updates
 * 5. Authenticate as platform administrator to perform rule updates
 * 6. Update the existing rule with modified properties
 * 7. Verify rule updates are applied immediately with proper validation
 * 8. Validate timestamp management and rule consistency
 *
 * This ensures platform administrators can effectively manage community
 * governance across the entire Reddit-style platform with proper rule
 * modification workflows.
 */
export async function test_api_community_rule_update_by_platform_administrator(
  connection: api.IConnection,
) {
  // Step 1: Create platform administrator account
  const platformAdminEmail: string = typia.random<
    string & tags.Format<"email">
  >();
  const platformAdmin: IRedditPlatformPlatformAdministrator.IAuthorized =
    await api.functional.auth.platformAdministrator.join(connection, {
      body: {
        username: `admin_${RandomGenerator.alphabets(8)}`,
        email: platformAdminEmail,
        password: "SecurePass123!",
        display_name: "Platform Administrator",
        administrator_level: "admin",
        system_permissions: JSON.stringify({
          user_management: {
            can_create_users: true,
            can_modify_users: true,
            can_view_user_data: true,
          },
          community_oversight: {
            can_create_communities: true,
            can_modify_communities: true,
            can_moderate_all_communities: true,
            can_view_community_data: true,
          },
          content_moderation: {
            can_remove_content: true,
            can_moderate_globally: true,
            can_manage_reports: true,
          },
          system_configuration: {
            can_manage_settings: true,
            can_view_system_logs: true,
          },
          compliance_legal: { can_access_compliance_data: true },
        }),
        security_clearance: "high",
      } satisfies IRedditPlatformPlatformAdministrator.ICreate,
    });
  typia.assert(platformAdmin);

  // Step 2: Create registered user account for community creation
  const userEmail: string = typia.random<string & tags.Format<"email">>();
  const registeredUser: IRedditPlatformRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.join(connection, {
      body: {
        username: `user_${RandomGenerator.alphabets(8)}`,
        email: userEmail,
        password: "UserPass123!",
        display_name: "Community Creator",
        href: "https://example.com/register",
        referrer: "https://example.com",
      } satisfies IRedditPlatformRegisteredUser.ICreate,
    });
  typia.assert(registeredUser);

  // Step 3: Create a test community with the registered user
  const communityName = `test_community_${RandomGenerator.alphabets(6)}`;
  const community: IRedditPlatformCommunity =
    await api.functional.redditPlatform.registeredUser.communities.create(
      connection,
      {
        body: {
          name: communityName,
          title: "Test Community for Rule Updates",
          description:
            "A test community used to validate platform administrator rule update functionality",
          type: "public",
          allow_text_posts: true,
          allow_link_posts: true,
          allow_image_posts: true,
          require_post_approval: false,
          require_comment_approval: false,
          nsfw_content_allowed: false,
        } satisfies IRedditPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  TestValidator.equals(
    "community creation successful",
    community.name,
    communityName,
  );

  // Step 4: Create initial community rule for testing updates
  const initialRule: IRedditPlatformCommunityRule =
    await api.functional.redditPlatform.communityModerator.communities.rules.create(
      connection,
      {
        communityName: community.name,
        body: {
          reddit_platform_community_id: community.id,
          title: "Original Rule Title",
          description:
            "This is the original rule description that will be updated by platform administrator",
          rule_type: "behavior",
          priority: 1,
          is_active: true,
        } satisfies IRedditPlatformCommunityRule.ICreate,
      },
    );
  typia.assert(initialRule);
  TestValidator.equals(
    "initial rule created",
    initialRule.title,
    "Original Rule Title",
  );
  TestValidator.equals("initial rule type", initialRule.rule_type, "behavior");
  TestValidator.equals("initial rule priority", initialRule.priority, 1);
  TestValidator.equals(
    "initial rule active status",
    initialRule.is_active,
    true,
  );

  // Step 5: Authenticate as platform administrator to perform rule updates
  await api.functional.auth.platformAdministrator.login(connection, {
    body: {
      email: platformAdminEmail,
      password: "SecurePass123!",
      ip: "192.168.1.100",
      href: "https://admin.example.com/dashboard",
      referrer: "https://admin.example.com",
    } satisfies IRedditPlatformPlatformAdministrator.ILogin,
  });

  // Step 6: Update the existing rule with modified properties
  const updatedRule: IRedditPlatformCommunityRule =
    await api.functional.redditPlatform.platformAdministrator.communities.rules.putByCommunitynameAndRuleid(
      connection,
      {
        communityName: community.name,
        ruleId: initialRule.id,
        body: {
          title: "Updated Rule Title by Platform Admin",
          description:
            "This rule has been successfully updated by the platform administrator with new content and guidelines",
          rule_type: "content",
          priority: 2,
          is_active: false,
        } satisfies IRedditPlatformCommunityRule.IUpdate,
      },
    );
  typia.assert(updatedRule);

  // Step 7: Verify rule updates are applied immediately with proper validation
  TestValidator.equals(
    "rule title updated successfully",
    updatedRule.title,
    "Updated Rule Title by Platform Admin",
  );
  TestValidator.equals(
    "rule description updated successfully",
    updatedRule.description,
    "This rule has been successfully updated by the platform administrator with new content and guidelines",
  );
  TestValidator.equals(
    "rule type updated successfully",
    updatedRule.rule_type,
    "content",
  );
  TestValidator.equals(
    "rule priority updated successfully",
    updatedRule.priority,
    2,
  );
  TestValidator.equals(
    "rule active status updated successfully",
    updatedRule.is_active,
    false,
  );
  TestValidator.equals("rule ID preserved", updatedRule.id, initialRule.id);
  TestValidator.equals(
    "community association preserved",
    updatedRule.reddit_platform_community_id,
    community.id,
  );

  // Step 8: Validate timestamp management and rule consistency
  TestValidator.predicate(
    "updated timestamp is newer than creation",
    new Date(updatedRule.updated_at) > new Date(initialRule.updated_at),
  );
  TestValidator.equals(
    "creation timestamp preserved",
    updatedRule.created_at,
    initialRule.created_at,
  );
  TestValidator.predicate(
    "violation count maintained",
    updatedRule.violation_count >= 0,
  );

  // Additional validation: Ensure rule is properly associated with the community
  TestValidator.equals(
    "community name consistency",
    community.name,
    communityName,
  );
  TestValidator.equals(
    "community ID consistency",
    community.id,
    updatedRule.reddit_platform_community_id,
  );
}
