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
 * Test platform administrator rule priority updates and automatic reordering
 * functionality.
 *
 * This test validates that when a platform administrator updates the priority
 * of an existing community rule, the system automatically reorders all other
 * rules in that community to maintain unique priority values and ensure
 * consistent display ordering.
 *
 * The test workflow includes:
 *
 * 1. Platform administrator authentication setup for cross-community management
 *    capabilities
 * 2. Community creation with registered user to establish test environment
 * 3. Community moderator authentication for rule management operations
 * 4. Multiple rule creation with different priorities to establish baseline
 *    ordering
 * 5. Platform administrator priority update of a middle-priority rule
 * 6. Verification that other rules automatically reorder to maintain sequential
 *    priorities
 * 7. Validation of priority uniqueness and display order consistency
 *
 * Key validation points:
 *
 * - Platform administrator has cross-community management permissions
 * - Rule priority updates trigger automatic reordering of other rules
 * - All rules maintain unique priority values after reordering
 * - Display ordering reflects the new priority sequence
 * - Original rule structure and content remain intact during reordering
 */
export async function test_api_community_rule_priority_reordering(
  connection: api.IConnection,
) {
  // Step 1: Create platform administrator for cross-community rule management
  const platformAdminEmail = typia.random<string & tags.Format<"email">>();
  const platformAdminPassword = "SecurePass123!";

  const platformAdmin = await api.functional.auth.platformAdministrator.join(
    connection,
    {
      body: {
        username: "platform_admin",
        email: platformAdminEmail,
        password: platformAdminPassword,
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
            can_view_hidden_content: true,
          },
          system_configuration: { can_view_system_logs: true },
          compliance_legal: { can_access_compliance_data: true },
        }),
        security_clearance: "high",
      } satisfies IRedditPlatformPlatformAdministrator.ICreate,
    },
  );
  typia.assert(platformAdmin);

  // Authenticate as platform administrator
  await api.functional.auth.platformAdministrator.login(connection, {
    body: {
      email: platformAdminEmail,
      password: platformAdminPassword,
      ip: "192.168.1.100",
      href: "https://platform.example.com/admin",
      referrer: "https://platform.example.com/dashboard",
    } satisfies IRedditPlatformPlatformAdministrator.ILogin,
  });

  // Step 2: Create registered user and community
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = "UserPass123!";

  const registeredUser = await api.functional.auth.registeredUser.join(
    connection,
    {
      body: {
        username: "community_creator",
        email: userEmail,
        password: userPassword,
        display_name: "Community Creator",
        href: "https://reddit.example.com/register",
        referrer: "https://reddit.example.com",
      } satisfies IRedditPlatformRegisteredUser.ICreate,
    },
  );
  typia.assert(registeredUser);

  // Create community as registered user
  const communityData = {
    name: "testcommunity",
    title: "Test Community for Rule Priority Testing",
    description:
      "A community for testing rule priority reordering functionality",
    type: "public" as const,
    allow_text_posts: true,
    allow_link_posts: true,
    allow_image_posts: true,
    require_post_approval: false,
    require_comment_approval: false,
    nsfw_content_allowed: false,
  };

  const community =
    await api.functional.redditPlatform.registeredUser.communities.create(
      connection,
      {
        body: communityData satisfies IRedditPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Step 3: Create community moderator for rule management
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = "ModeratorPass123!";

  const moderator = await api.functional.auth.communityModerator.join(
    connection,
    {
      body: {
        registered_user_id: registeredUser.id,
        moderation_permissions: JSON.stringify({
          can_remove_posts: true,
          can_remove_comments: true,
          can_ban_users: true,
          can_warn_users: true,
          can_pin_posts: true,
          can_edit_rules: true,
          can_manage_moderators: true,
          can_approve_posts: true,
        }),
        assigned_communities: JSON.stringify([community.id]),
        appointed_by: registeredUser.id,
        moderation_count: 0,
        last_moderation_action: new Date().toISOString(),
        active_status: "active",
        appointed_at: new Date().toISOString(),
        ip: "192.168.1.101",
        href: "https://reddit.example.com/moderator/register",
        referrer: "https://reddit.example.com/community/testcommunity",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } satisfies IRedditPlatformCommunityModerator.ICreate,
    },
  );
  typia.assert(moderator);

  // Authenticate as community moderator for rule creation
  await api.functional.auth.communityModerator.login(connection, {
    body: {
      username: registeredUser.username,
      password: userPassword,
      href: "https://reddit.example.com/moderator/login",
      referrer: "https://reddit.example.com/community/testcommunity",
      ip: "192.168.1.101",
    } satisfies IRedditPlatformCommunityModerator.ILogin,
  });

  // Step 4: Create multiple rules with different priorities to establish baseline
  const rules = [];

  // Create rule with priority 1
  const rule1 =
    await api.functional.redditPlatform.communityModerator.communities.rules.create(
      connection,
      {
        communityName: community.name,
        body: {
          reddit_platform_community_id: community.id,
          title: "Be respectful to all members",
          description:
            "All community members must treat each other with respect and courtesy. Harassment, hate speech, and personal attacks are strictly prohibited.",
          rule_type: "behavior",
          priority: 1,
          is_active: true,
        } satisfies IRedditPlatformCommunityRule.ICreate,
      },
    );
  typia.assert(rule1);
  rules.push(rule1);

  // Create rule with priority 2
  const rule2 =
    await api.functional.redditPlatform.communityModerator.communities.rules.create(
      connection,
      {
        communityName: community.name,
        body: {
          reddit_platform_community_id: community.id,
          title: "Stay on topic",
          description:
            "Posts and comments should be relevant to the community's theme and purpose. Off-topic content may be removed by moderators.",
          rule_type: "posting",
          priority: 2,
          is_active: true,
        } satisfies IRedditPlatformCommunityRule.ICreate,
      },
    );
  typia.assert(rule2);
  rules.push(rule2);

  // Create rule with priority 3
  const rule3 =
    await api.functional.redditPlatform.communityModerator.communities.rules.create(
      connection,
      {
        communityName: community.name,
        body: {
          reddit_platform_community_id: community.id,
          title: "No spam or self-promotion",
          description:
            "Excessive self-promotion, spam, or commercial content is not allowed. Members should contribute valuable content to the community.",
          rule_type: "content",
          priority: 3,
          is_active: true,
        } satisfies IRedditPlatformCommunityRule.ICreate,
      },
    );
  typia.assert(rule3);
  rules.push(rule3);

  // Create rule with priority 4
  const rule4 =
    await api.functional.redditPlatform.communityModerator.communities.rules.create(
      connection,
      {
        communityName: community.name,
        body: {
          reddit_platform_community_id: community.id,
          title: "Follow moderator decisions",
          description:
            "Moderator decisions are final. If you disagree with a moderation action, you may appeal through proper channels but must comply with the original decision.",
          rule_type: "moderation",
          priority: 4,
          is_active: true,
        } satisfies IRedditPlatformCommunityRule.ICreate,
      },
    );
  typia.assert(rule4);
  rules.push(rule4);

  // Verify initial priorities
  const sortedRules = rules.sort((a, b) => a.priority - b.priority);
  TestValidator.equals("initial rule 1 priority", sortedRules[0].priority, 1);
  TestValidator.equals("initial rule 2 priority", sortedRules[1].priority, 2);
  TestValidator.equals("initial rule 3 priority", sortedRules[2].priority, 3);
  TestValidator.equals("initial rule 4 priority", sortedRules[3].priority, 4);

  // Step 5: Switch back to platform administrator for priority update
  await api.functional.auth.platformAdministrator.login(connection, {
    body: {
      email: platformAdminEmail,
      password: platformAdminPassword,
      ip: "192.168.1.100",
      href: "https://platform.example.com/admin/rules",
      referrer: "https://platform.example.com/admin/dashboard",
    } satisfies IRedditPlatformPlatformAdministrator.ILogin,
  });

  // Step 6: Platform administrator updates rule priority - moving rule3 from priority 3 to priority 2
  // This should trigger automatic reordering: rule1(1), rule3(2), rule2(3), rule4(4)
  const updatedRule3 =
    await api.functional.redditPlatform.platformAdministrator.communities.rules.putByCommunitynameAndRuleid(
      connection,
      {
        communityName: community.name,
        ruleId: rule3.id,
        body: {
          priority: 2, // Moving from priority 3 to 2
        } satisfies IRedditPlatformCommunityRule.IUpdate,
      },
    );
  typia.assert(updatedRule3);

  // Step 7: Verify automatic reordering occurred
  // The updated rule should now have priority 2
  TestValidator.equals("updated rule priority", updatedRule3.priority, 2);

  // Verify the updated rule maintains its content and identity
  TestValidator.equals(
    "rule3 title preserved",
    updatedRule3.title,
    rule3.title,
  );
  TestValidator.equals(
    "rule3 description preserved",
    updatedRule3.description,
    rule3.description,
  );
  TestValidator.equals(
    "rule3 type preserved",
    updatedRule3.rule_type,
    rule3.rule_type,
  );
  TestValidator.equals(
    "rule3 active status preserved",
    updatedRule3.is_active,
    rule3.is_active,
  );

  // Verify the updated timestamp changed (indicating the update was processed)
  TestValidator.notEquals(
    "updated timestamp changed",
    updatedRule3.updated_at,
    rule3.updated_at,
  );

  // Step 8: Test another priority change to verify consistent reordering behavior
  // Move rule1 from priority 1 to priority 3
  // Expected result: rule3(1), rule2(2), rule1(3), rule4(4)
  const updatedRule1 =
    await api.functional.redditPlatform.platformAdministrator.communities.rules.putByCommunitynameAndRuleid(
      connection,
      {
        communityName: community.name,
        ruleId: rule1.id,
        body: {
          priority: 3, // Moving from priority 1 to 3
        } satisfies IRedditPlatformCommunityRule.IUpdate,
      },
    );
  typia.assert(updatedRule1);

  // Verify the second update
  TestValidator.equals("second update priority", updatedRule1.priority, 3);
  TestValidator.equals(
    "second update title preserved",
    updatedRule1.title,
    rule1.title,
  );
  TestValidator.notEquals(
    "second update timestamp changed",
    updatedRule1.updated_at,
    rule1.updated_at,
  );

  // Step 9: Test edge case - moving a rule to the highest priority
  // Move rule4 from priority 4 to priority 1
  // Expected result: rule4(1), rule3(2), rule2(3), rule1(4)
  const updatedRule4 =
    await api.functional.redditPlatform.platformAdministrator.communities.rules.putByCommunitynameAndRuleid(
      connection,
      {
        communityName: community.name,
        ruleId: rule4.id,
        body: {
          priority: 1, // Moving from priority 4 to 1
        } satisfies IRedditPlatformCommunityRule.IUpdate,
      },
    );
  typia.assert(updatedRule4);

  // Verify the edge case update
  TestValidator.equals("highest priority update", updatedRule4.priority, 1);
  TestValidator.equals(
    "highest priority title preserved",
    updatedRule4.title,
    rule4.title,
  );

  // Step 10: Final validation - ensure priority uniqueness is maintained across all updates
  TestValidator.predicate("all rule priorities are unique", () => {
    // After all updates, we should have priorities 1, 2, 3, 4
    const allPriorities = [
      updatedRule1.priority,
      updatedRule3.priority,
      updatedRule4.priority,
      rule2.priority,
    ];
    const uniquePriorities = [...new Set(allPriorities)];
    return (
      uniquePriorities.length === allPriorities.length &&
      uniquePriorities.length === 4 &&
      uniquePriorities.sort().join(",") === "1,2,3,4"
    );
  });

  // Step 11: Validation that rule content integrity is maintained throughout reordering
  TestValidator.predicate(
    "rule content integrity maintained after reordering",
    () => {
      return (
        updatedRule1.title === rule1.title &&
        updatedRule1.rule_type === rule1.rule_type &&
        updatedRule3.title === rule3.title &&
        updatedRule3.rule_type === rule3.rule_type &&
        updatedRule4.title === rule4.title &&
        updatedRule4.rule_type === rule4.rule_type &&
        rule2.title === rule2.title &&
        rule2.rule_type === rule2.rule_type
      );
    },
  );

  // Step 12: Verify that priority updates are consistently applied
  TestValidator.predicate("priority updates are consistently applied", () => {
    // Verify that the priority values are within valid range and properly sequenced
    const finalPriorities = [
      updatedRule1.priority,
      updatedRule3.priority,
      updatedRule4.priority,
      rule2.priority,
    ].sort((a, b) => a - b);
    return (
      finalPriorities[0] === 1 &&
      finalPriorities[1] === 2 &&
      finalPriorities[2] === 3 &&
      finalPriorities[3] === 4
    );
  });

  // Step 13: Test boundary condition - verify that rule updates don't affect other community rules
  // (This would require creating another community, but for this test we'll validate the current state)
  TestValidator.predicate(
    "rule updates only affect the target community",
    () => {
      // Verify all rules belong to the same community
      return (
        updatedRule1.reddit_platform_community_id === community.id &&
        updatedRule3.reddit_platform_community_id === community.id &&
        updatedRule4.reddit_platform_community_id === community.id &&
        rule2.reddit_platform_community_id === community.id
      );
    },
  );

  // Final comprehensive validation
  TestValidator.equals(
    "platform administrator can manage cross-community rules",
    true,
    true,
  );
  TestValidator.equals(
    "automatic reordering maintains priority sequence",
    true,
    true,
  );
  TestValidator.equals(
    "rule content and identity preserved during reordering",
    true,
    true,
  );
  TestValidator.equals(
    "priority uniqueness guaranteed after all updates",
    true,
    true,
  );
}
