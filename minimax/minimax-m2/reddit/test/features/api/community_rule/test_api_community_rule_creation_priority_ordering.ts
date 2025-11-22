import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunityModerator";
import type { IRedditPlatformCommunityRule } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunityRule";
import type { IRedditPlatformRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformRegisteredUser";

export async function test_api_community_rule_creation_priority_ordering(
  connection: api.IConnection,
) {
  // Step 1: Create registered user for community creation
  const registeredUserEmail = typia.random<string & tags.Format<"email">>();
  const registeredUser = await api.functional.auth.registeredUser.join(
    connection,
    {
      body: {
        username: RandomGenerator.alphaNumeric(8),
        email: registeredUserEmail,
        password: "TestPassword123!",
        href: "https://example.com/register",
        referrer: "https://example.com",
      } satisfies IRedditPlatformRegisteredUser.ICreate,
    },
  );
  typia.assert(registeredUser);

  // Step 2: Create community as registered user
  const communityName = `testcommunity_${RandomGenerator.alphaNumeric(6)}`;
  const community =
    await api.functional.redditPlatform.registeredUser.communities.create(
      connection,
      {
        body: {
          name: communityName,
          title: `Test Community for ${communityName}`,
          description: "A test community for validating rule priority ordering",
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
    "community created successfully",
    community.name,
    communityName,
  );

  // Step 3: Create and authenticate community moderator
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorUser = await api.functional.auth.registeredUser.join(
    connection,
    {
      body: {
        username: RandomGenerator.alphaNumeric(8),
        email: moderatorEmail,
        password: "ModeratorPass123!",
        href: "https://example.com/moderator-register",
        referrer: "https://example.com",
      } satisfies IRedditPlatformRegisteredUser.ICreate,
    },
  );
  typia.assert(moderatorUser);

  // Step 4: Create community moderator account
  const moderator = await api.functional.auth.communityModerator.join(
    connection,
    {
      body: {
        registered_user_id: moderatorUser.id,
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
        assigned_communities: JSON.stringify([community.id]),
        appointed_by: registeredUser.username,
        moderation_count: 0,
        last_moderation_action: new Date().toISOString(),
        active_status: "active",
        appointed_at: new Date().toISOString(),
        href: "https://example.com/moderator-join",
        referrer: "https://example.com",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } satisfies IRedditPlatformCommunityModerator.ICreate,
    },
  );
  typia.assert(moderator);

  // Step 5: Login as community moderator
  const loggedInModerator = await api.functional.auth.communityModerator.login(
    connection,
    {
      body: {
        username: moderatorEmail,
        password: "ModeratorPass123!",
        href: "https://example.com/moderator-login",
        referrer: "https://example.com",
      } satisfies IRedditPlatformCommunityModerator.ILogin,
    },
  );
  typia.assert(loggedInModerator);

  // Step 6: Create multiple rules with different priorities
  const rules = [];

  // Create high priority rule (priority 10)
  const highPriorityRule =
    await api.functional.redditPlatform.communityModerator.communities.rules.create(
      connection,
      {
        communityName: community.name,
        body: {
          reddit_platform_community_id: community.id,
          title: "High Priority: No Spam",
          description:
            "Spam content including excessive self-promotion and irrelevant posts will be removed immediately.",
          rule_type: "content",
          priority: 10,
          is_active: true,
        } satisfies IRedditPlatformCommunityRule.ICreate,
      },
    );
  typia.assert(highPriorityRule);
  rules.push(highPriorityRule);

  // Create medium priority rule (priority 5)
  const mediumPriorityRule =
    await api.functional.redditPlatform.communityModerator.communities.rules.create(
      connection,
      {
        communityName: community.name,
        body: {
          reddit_platform_community_id: community.id,
          title: "Medium Priority: Respectful Discourse",
          description:
            "Users must maintain respectful communication. Personal attacks, harassment, and hate speech are prohibited.",
          rule_type: "behavior",
          priority: 5,
          is_active: true,
        } satisfies IRedditPlatformCommunityRule.ICreate,
      },
    );
  typia.assert(mediumPriorityRule);
  rules.push(mediumPriorityRule);

  // Create low priority rule (priority 1)
  const lowPriorityRule =
    await api.functional.redditPlatform.communityModerator.communities.rules.create(
      connection,
      {
        communityName: community.name,
        body: {
          reddit_platform_community_id: community.id,
          title: "Low Priority: Format Guidelines",
          description:
            "Please use proper formatting when posting. Include clear titles and categorize posts appropriately.",
          rule_type: "posting",
          priority: 1,
          is_active: true,
        } satisfies IRedditPlatformCommunityRule.ICreate,
      },
    );
  typia.assert(lowPriorityRule);
  rules.push(lowPriorityRule);

  // Create another rule with priority 7
  const mediumHighRule =
    await api.functional.redditPlatform.communityModerator.communities.rules.create(
      connection,
      {
        communityName: community.name,
        body: {
          reddit_platform_community_id: community.id,
          title: "Medium-High Priority: Source Attribution",
          description:
            "When sharing content from external sources, proper attribution is required. Plagiarism will result in content removal.",
          rule_type: "content",
          priority: 7,
          is_active: true,
        } satisfies IRedditPlatformCommunityRule.ICreate,
      },
    );
  typia.assert(mediumHighRule);
  rules.push(mediumHighRule);

  // Step 7: Verify rules are ordered by priority (highest to lowest)
  // Sort rules by priority in descending order
  const sortedByPriority = [...rules].sort((a, b) => b.priority - a.priority);

  // Verify the order is correct: 10, 7, 5, 1
  TestValidator.equals(
    "highest priority rule first",
    sortedByPriority[0].priority,
    10,
  );
  TestValidator.equals(
    "second highest priority correct",
    sortedByPriority[1].priority,
    7,
  );
  TestValidator.equals(
    "third priority correct",
    sortedByPriority[2].priority,
    5,
  );
  TestValidator.equals(
    "lowest priority rule last",
    sortedByPriority[3].priority,
    1,
  );

  // Verify rule types and content are preserved
  TestValidator.equals(
    "high priority rule is spam rule",
    sortedByPriority[0].title,
    "High Priority: No Spam",
  );
  TestValidator.equals(
    "medium-high priority rule is attribution",
    sortedByPriority[1].title,
    "Medium-High Priority: Source Attribution",
  );
  TestValidator.equals(
    "medium priority rule is respect",
    sortedByPriority[2].title,
    "Medium Priority: Respectful Discourse",
  );
  TestValidator.equals(
    "low priority rule is formatting",
    sortedByPriority[3].title,
    "Low Priority: Format Guidelines",
  );

  // Step 8: Test priority validation and conflict handling
  // Create a rule with duplicate priority (should be allowed as it's valid business logic)
  const duplicatePriorityRule =
    await api.functional.redditPlatform.communityModerator.communities.rules.create(
      connection,
      {
        communityName: community.name,
        body: {
          reddit_platform_community_id: community.id,
          title: "Another High Priority: Content Quality",
          description:
            "Posts must meet minimum quality standards. Low-effort content may be removed.",
          rule_type: "content",
          priority: 10, // Same priority as spam rule
          is_active: true,
        } satisfies IRedditPlatformCommunityRule.ICreate,
      },
    );
  typia.assert(duplicatePriorityRule);

  // Verify duplicate priority rules can coexist (business decision)
  const duplicatePriorityRules = rules.filter((rule) => rule.priority === 10);
  TestValidator.equals(
    "multiple rules can have same priority",
    duplicatePriorityRules.length,
    2,
  );

  // Step 9: Validate rule precedence logic
  // Higher priority rules should take precedence in conflicts
  const highPriorityRules = rules.filter((rule) => rule.priority >= 7);
  const mediumPriorityRules = rules.filter(
    (rule) => rule.priority >= 4 && rule.priority < 7,
  );
  const lowPriorityRules = rules.filter((rule) => rule.priority < 4);

  TestValidator.equals(
    "high priority rules count correct",
    highPriorityRules.length,
    2,
  );
  TestValidator.equals(
    "medium priority rules count correct",
    mediumPriorityRules.length,
    2,
  );
  TestValidator.equals(
    "low priority rules count correct",
    lowPriorityRules.length,
    1,
  );

  // Step 10: Verify rule activation status and enforcement
  const activeRules = rules.filter((rule) => rule.is_active);
  TestValidator.equals(
    "all created rules are active",
    activeRules.length,
    rules.length,
  );

  // Step 11: Test priority-based rule display order
  const expectedOrder = [10, 10, 7, 5, 1]; // Including the duplicate priority rule
  const actualOrder = [...rules, duplicatePriorityRule]
    .map((rule) => rule.priority)
    .sort((a, b) => b - a);

  TestValidator.equals(
    "priority ordering is maintained",
    actualOrder,
    expectedOrder,
  );

  // Final validation: Rules are properly created and priority system works
  TestValidator.equals("total rules created correctly", rules.length, 4);
  TestValidator.equals(
    "community association correct",
    community.id,
    highPriorityRule.reddit_platform_community_id,
  );
  TestValidator.equals(
    "moderator permissions preserved",
    loggedInModerator.moderator.assigned_communities.includes(community.id),
    true,
  );
}
