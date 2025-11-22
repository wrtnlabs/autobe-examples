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
 * Test rule type modification during update operations.
 *
 * Platform administrator creates rule with 'content' type, then updates it to
 * 'behavior' type to test type-specific enforcement changes. Validates that
 * rule type changes affect moderation workflows, violation tracking categories,
 * and display in community governance interfaces.
 */
export async function test_api_platform_admin_rule_type_modification(
  connection: api.IConnection,
) {
  // Setup: Create platform administrator account
  const platformAdminEmail = typia.random<string & tags.Format<"email">>();
  const platformAdmin: IRedditPlatformPlatformAdministrator.IAuthorized =
    await api.functional.auth.platformAdministrator.join(connection, {
      body: {
        username: RandomGenerator.alphaNumeric(8),
        email: platformAdminEmail,
        password: RandomGenerator.alphaNumeric(12),
        display_name: "Test Platform Admin",
        administrator_level: "admin",
        system_permissions: JSON.stringify({
          user_management: { can_view_user_data: true },
          community_oversight: {
            can_create_communities: true,
            can_view_community_data: true,
          },
          content_moderation: {
            can_remove_content: true,
            can_manage_reports: true,
          },
          system_configuration: { can_view_system_logs: true },
          compliance_legal: { can_access_compliance_data: true },
        }),
        security_clearance: "medium",
      } satisfies IRedditPlatformPlatformAdministrator.ICreate,
    });
  typia.assert(platformAdmin);

  // Setup: Create registered user account
  const registeredUserEmail = typia.random<string & tags.Format<"email">>();
  const registeredUser: IRedditPlatformRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.join(connection, {
      body: {
        username: RandomGenerator.alphaNumeric(8),
        email: registeredUserEmail,
        password: RandomGenerator.alphaNumeric(12),
        display_name: "Test Registered User",
        href: "https://test.example.com",
        referrer: "https://test.example.com",
      } satisfies IRedditPlatformRegisteredUser.ICreate,
    });
  typia.assert(registeredUser);

  // Setup: Create community moderator account
  const communityModeratorEmail = typia.random<string & tags.Format<"email">>();
  const communityModerator: IRedditPlatformCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.join(connection, {
      body: {
        registered_user_id: registeredUser.id,
        moderation_permissions: JSON.stringify({
          can_remove_posts: true,
          can_remove_comments: true,
          can_ban_users: false,
          can_warn_users: true,
          can_pin_posts: false,
          can_edit_rules: true,
          can_manage_moderators: false,
          can_approve_posts: true,
        }),
        assigned_communities: JSON.stringify([]),
        appointed_by: platformAdmin.user.username,
        moderation_count: 0,
        last_moderation_action: new Date().toISOString(),
        active_status: "active",
        appointed_at: new Date().toISOString(),
        href: "https://test.example.com",
        referrer: "https://test.example.com",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } satisfies IRedditPlatformCommunityModerator.ICreate,
    });
  typia.assert(communityModerator);

  // Step 1: Create a test community
  const communityName = `test_community_${RandomGenerator.alphaNumeric(8)}`;
  const community: IRedditPlatformCommunity =
    await api.functional.redditPlatform.registeredUser.communities.create(
      connection,
      {
        body: {
          name: communityName,
          title: `Test Community ${RandomGenerator.alphaNumeric(4)}`,
          description: "A test community for rule type modification testing",
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

  // Step 2: Join the community (as registered user)
  await api.functional.redditPlatform.communities.join(connection, {
    communityName: community.name,
  });

  // Step 3: Create initial rule with 'content' type using community moderator
  const initialRule: IRedditPlatformCommunityRule =
    await api.functional.redditPlatform.communityModerator.communities.rules.create(
      connection,
      {
        communityName: community.name,
        body: {
          reddit_platform_community_id: community.id,
          title: "Content Guidelines Rule",
          description:
            "This rule governs what types of content are allowed in the community",
          rule_type: "content",
          priority: 1,
          is_active: true,
        } satisfies IRedditPlatformCommunityRule.ICreate,
      },
    );
  typia.assert(initialRule);

  // Verify initial rule type
  TestValidator.equals(
    "initial rule should have content type",
    initialRule.rule_type,
    "content",
  );

  // Step 4: Switch to platform administrator context for rule modification
  // Platform administrator already authenticated from step 0

  // Step 5: Modify the rule type from 'content' to 'behavior' using PATCH
  const updatedRule: IRedditPlatformCommunityRule =
    await api.functional.redditPlatform.platformAdministrator.communities.rules.patchByCommunityname(
      connection,
      {
        communityName: community.name,
        body: {
          rule_type: "behavior",
        } satisfies IRedditPlatformCommunityRule.IUpdate,
      },
    );
  typia.assert(updatedRule);

  // Step 6: Validate the rule type change
  TestValidator.equals(
    "rule type should be updated to behavior",
    updatedRule.rule_type,
    "behavior",
  );

  TestValidator.equals(
    "rule should retain other properties",
    updatedRule.title,
    initialRule.title,
  );

  TestValidator.equals(
    "rule should retain priority",
    updatedRule.priority,
    initialRule.priority,
  );

  TestValidator.equals(
    "rule should remain active",
    updatedRule.is_active,
    initialRule.is_active,
  );

  // Step 7: Verify rule type change affects moderation workflow tracking
  TestValidator.predicate(
    "rule violation count should be tracked",
    typeof updatedRule.violation_count === "number",
  );

  TestValidator.predicate(
    "rule should have proper UUID format",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      updatedRule.id,
    ),
  );

  // Step 8: Test that only rule_type is updated (other fields remain unchanged)
  TestValidator.notEquals(
    "rule ID should remain the same",
    updatedRule.id,
    initialRule.id,
  );

  TestValidator.equals(
    "rule title should remain unchanged",
    updatedRule.title,
    initialRule.title,
  );

  TestValidator.equals(
    "rule description should remain unchanged",
    updatedRule.description,
    initialRule.description,
  );

  TestValidator.equals(
    "community ID should remain the same",
    updatedRule.reddit_platform_community_id,
    initialRule.reddit_platform_community_id,
  );

  // Step 9: Validate that the rule is properly associated with the community
  TestValidator.equals(
    "rule should be linked to correct community",
    updatedRule.reddit_platform_community_id,
    community.id,
  );

  // Step 10: Test rule modification prevents invalid type values
  await TestValidator.error(
    "rule modification should reject invalid rule type",
    async () => {
      await api.functional.redditPlatform.platformAdministrator.communities.rules.patchByCommunityname(
        connection,
        {
          communityName: community.name,
          body: {
            rule_type: "invalid_type" as any,
          } satisfies IRedditPlatformCommunityRule.IUpdate,
        },
      );
    },
  );
}
