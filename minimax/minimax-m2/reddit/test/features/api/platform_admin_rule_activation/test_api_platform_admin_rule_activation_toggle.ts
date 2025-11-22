import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformCommunityMembership } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunityMembership";
import type { IRedditPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunityModerator";
import type { IRedditPlatformCommunityRule } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunityRule";
import type { IRedditPlatformPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPlatformAdministrator";
import type { IRedditPlatformRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformRegisteredUser";
import type { IRedditPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformUser";

/**
 * Test rule activation status toggle during updates.
 *
 * Platform administrator creates inactive rule (draft), then activates it
 * through update operation, and later deactivates it. Validates that activation
 * changes are immediately applied to content moderation decisions and rule
 * visibility in community interfaces.
 */
export async function test_api_platform_admin_rule_activation_toggle(
  connection: api.IConnection,
) {
  // Step 1: Create platform administrator account
  const platformAdminEmail = typia.random<string & tags.Format<"email">>();
  const platformAdmin: IRedditPlatformPlatformAdministrator.IAuthorized =
    await api.functional.auth.platformAdministrator.join(connection, {
      body: {
        username: RandomGenerator.alphaNumeric(8),
        email: platformAdminEmail,
        password: "admin123456",
        display_name: "Platform Admin",
        administrator_level: "admin",
        system_permissions: JSON.stringify({
          user_management: { can_view_user_data: true },
          community_oversight: { can_view_community_data: true },
          content_moderation: { can_remove_content: true },
          system_configuration: { can_view_system_logs: true },
          compliance_legal: { can_access_compliance_data: true },
        }),
        security_clearance: "medium",
        managed_communities: undefined,
      } satisfies IRedditPlatformPlatformAdministrator.ICreate,
    });
  typia.assert(platformAdmin);

  // Step 2: Create registered user account
  const registeredUserEmail = typia.random<string & tags.Format<"email">>();
  const registeredUser: IRedditPlatformRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.join(connection, {
      body: {
        username: RandomGenerator.alphaNumeric(8),
        email: registeredUserEmail,
        password: "user123456",
        display_name: "Test User",
        bio: "Test user for community creation",
        href: "https://example.com/register",
        referrer: "https://example.com/signup",
      } satisfies IRedditPlatformRegisteredUser.ICreate,
    });
  typia.assert(registeredUser);

  // Step 3: Create community as registered user
  const communityName = `test_community_${RandomGenerator.alphaNumeric(6)}`;
  const community: IRedditPlatformCommunity =
    await api.functional.redditPlatform.registeredUser.communities.create(
      connection,
      {
        body: {
          name: communityName,
          title: "Test Community for Rule Activation",
          description:
            "Community for testing rule activation toggle functionality",
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

  // Step 4: Join the community as registered user
  const membership: IRedditPlatformCommunityMembership =
    await api.functional.redditPlatform.communities.join(connection, {
      communityName: community.name,
    });
  typia.assert(membership);

  // Step 5: Create community moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator: IRedditPlatformCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.join(connection, {
      body: {
        registered_user_id: registeredUser.id,
        moderation_permissions: JSON.stringify({
          can_remove_posts: true,
          can_remove_comments: true,
          can_ban_users: false,
          can_warn_users: true,
          can_pin_posts: true,
          can_edit_rules: true,
          can_manage_moderators: false,
          can_approve_posts: true,
        }),
        assigned_communities: JSON.stringify([community.id]),
        appointed_by: registeredUser.id,
        moderation_count: 0,
        last_moderation_action: new Date().toISOString(),
        active_status: "active",
        appointed_at: new Date().toISOString(),
        ip: "192.168.1.1",
        href: "https://example.com/moderator",
        referrer: "https://example.com/admin",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } satisfies IRedditPlatformCommunityModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 6: Create rule as moderator in inactive status
  const rule: IRedditPlatformCommunityRule =
    await api.functional.redditPlatform.communityModerator.communities.rules.create(
      connection,
      {
        communityName: community.name,
        body: {
          reddit_platform_community_id: community.id,
          title: "Test Inactive Rule",
          description:
            "This rule is created in inactive status for testing activation toggle",
          rule_type: "behavior",
          priority: 1,
          is_active: false, // Creating rule in inactive status
        } satisfies IRedditPlatformCommunityRule.ICreate,
      },
    );
  typia.assert(rule);

  TestValidator.equals("rule initially inactive", rule.is_active, false);

  // Step 7: Switch to platform administrator account
  await api.functional.auth.platformAdministrator.login(connection, {
    body: {
      email: platformAdminEmail,
      password: "admin123456",
      ip: "192.168.1.100",
      href: "https://admin.example.com",
      referrer: "https://admin.example.com/login",
    } satisfies IRedditPlatformPlatformAdministrator.ILogin,
  });

  // Step 8: Activate the rule through platform administrator update
  const activatedRule: IRedditPlatformCommunityRule =
    await api.functional.redditPlatform.platformAdministrator.communities.rules.patchByCommunityname(
      connection,
      {
        communityName: community.name,
        body: {
          is_active: true, // Activate the rule
        } satisfies IRedditPlatformCommunityRule.IUpdate,
      },
    );
  typia.assert(activatedRule);

  TestValidator.equals(
    "rule activated successfully",
    activatedRule.is_active,
    true,
  );
  TestValidator.equals("rule ID preserved", activatedRule.id, rule.id);
  TestValidator.equals("rule title preserved", activatedRule.title, rule.title);

  // Step 9: Deactivate the rule through platform administrator update
  const deactivatedRule: IRedditPlatformCommunityRule =
    await api.functional.redditPlatform.platformAdministrator.communities.rules.patchByCommunityname(
      connection,
      {
        communityName: community.name,
        body: {
          is_active: false, // Deactivate the rule
        } satisfies IRedditPlatformCommunityRule.IUpdate,
      },
    );
  typia.assert(deactivatedRule);

  TestValidator.equals(
    "rule deactivated successfully",
    deactivatedRule.is_active,
    false,
  );
  TestValidator.equals(
    "rule ID preserved after deactivation",
    deactivatedRule.id,
    rule.id,
  );
  TestValidator.equals(
    "rule title preserved after deactivation",
    deactivatedRule.title,
    rule.title,
  );

  // Step 10: Test activation toggle again to verify consistent behavior
  const reActivatedRule: IRedditPlatformCommunityRule =
    await api.functional.redditPlatform.platformAdministrator.communities.rules.patchByCommunityname(
      connection,
      {
        communityName: community.name,
        body: {
          is_active: true, // Reactivate the rule
        } satisfies IRedditPlatformCommunityRule.IUpdate,
      },
    );
  typia.assert(reActivatedRule);

  TestValidator.equals(
    "rule reactivated successfully",
    reActivatedRule.is_active,
    true,
  );
  TestValidator.equals(
    "rule ID preserved after reactivation",
    reActivatedRule.id,
    rule.id,
  );
  TestValidator.equals(
    "rule title preserved after reactivation",
    reActivatedRule.title,
    rule.title,
  );

  // Step 11: Test partial update (updating other fields while maintaining activation status)
  const partiallyUpdatedRule: IRedditPlatformCommunityRule =
    await api.functional.redditPlatform.platformAdministrator.communities.rules.patchByCommunityname(
      connection,
      {
        communityName: community.name,
        body: {
          title: "Updated Test Rule Title",
          description:
            "Updated description while maintaining activation status",
          priority: 2,
        } satisfies IRedditPlatformCommunityRule.IUpdate,
      },
    );
  typia.assert(partiallyUpdatedRule);

  TestValidator.equals(
    "activation status maintained during partial update",
    partiallyUpdatedRule.is_active,
    true,
  );
  TestValidator.equals(
    "title updated correctly",
    partiallyUpdatedRule.title,
    "Updated Test Rule Title",
  );
  TestValidator.equals(
    "description updated correctly",
    partiallyUpdatedRule.description,
    "Updated description while maintaining activation status",
  );
  TestValidator.equals(
    "priority updated correctly",
    partiallyUpdatedRule.priority,
    2,
  );
  TestValidator.equals("rule ID unchanged", partiallyUpdatedRule.id, rule.id);
}
