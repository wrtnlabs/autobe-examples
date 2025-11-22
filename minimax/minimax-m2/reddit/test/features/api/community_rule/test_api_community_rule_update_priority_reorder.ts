import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunityModerator";
import type { IRedditPlatformCommunityRule } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunityRule";
import type { IRedditPlatformRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformRegisteredUser";

export async function test_api_community_rule_update_priority_reorder(
  connection: api.IConnection,
) {
  // Step 1: Create registered user account for community creation
  const registeredUserEmail = typia.random<string & tags.Format<"email">>();
  const registeredUser: IRedditPlatformRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.join(connection, {
      body: {
        username: RandomGenerator.name(1),
        email: registeredUserEmail,
        password: "testPassword123",
        href: "https://example.com/test",
        referrer: "https://example.com/referrer",
      } satisfies IRedditPlatformRegisteredUser.ICreate,
    });
  typia.assert(registeredUser);

  // Step 2: Create a separate registered user for moderator conversion
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorUser: IRedditPlatformRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.join(connection, {
      body: {
        username: RandomGenerator.name(1),
        email: moderatorEmail,
        password: "moderatorPassword123",
        href: "https://example.com/moderator",
        referrer: "https://example.com/moderator-ref",
      } satisfies IRedditPlatformRegisteredUser.ICreate,
    });
  typia.assert(moderatorUser);

  // Step 3: Create community as registered user
  const communityData = {
    name: `testcommunity_${RandomGenerator.alphaNumeric(8)}`,
    title: "Test Community for Priority Testing",
    description: "A test community to verify rule priority management",
    type: "public" as const,
    allow_text_posts: true,
    allow_link_posts: true,
    allow_image_posts: true,
    require_post_approval: false,
    require_comment_approval: false,
    nsfw_content_allowed: false,
  };

  const community: IRedditPlatformCommunity =
    await api.functional.redditPlatform.registeredUser.communities.create(
      connection,
      {
        body: communityData satisfies IRedditPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Step 4: Switch back to registered user context for moderator creation
  await api.functional.auth.registeredUser.login(connection, {
    body: {
      email: moderatorUser.email,
      password: "moderatorPassword123",
      href: "https://example.com/moderator-login",
      referrer: "https://example.com/moderator-ref-login",
    } satisfies IRedditPlatformRegisteredUser.ILogin,
  });

  // Step 5: Authenticate as community moderator
  const moderatorLogin: IRedditPlatformCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.login(connection, {
      body: {
        username: moderatorUser.username,
        password: "moderatorPassword123",
        href: "https://example.com/moderator-login",
        referrer: "https://example.com/moderator-ref-login",
      } satisfies IRedditPlatformCommunityModerator.ILogin,
    });
  typia.assert(moderatorLogin);

  // Step 6: Create multiple rules with different priorities
  const rules: IRedditPlatformCommunityRule[] = [];

  // Create rule with priority 1
  const rule1Data = {
    reddit_platform_community_id: community.id,
    title: "Rule 1 - Highest Priority",
    description: "This is the highest priority rule in the community",
    rule_type: "content" as const,
    priority: 1,
    is_active: true,
  };
  const rule1: IRedditPlatformCommunityRule =
    await api.functional.redditPlatform.communityModerator.communities.rules.create(
      connection,
      {
        communityName: community.name,
        body: rule1Data satisfies IRedditPlatformCommunityRule.ICreate,
      },
    );
  typia.assert(rule1);
  rules.push(rule1);

  // Create rule with priority 2
  const rule2Data = {
    reddit_platform_community_id: community.id,
    title: "Rule 2 - Medium Priority",
    description: "This is the medium priority rule in the community",
    rule_type: "behavior" as const,
    priority: 2,
    is_active: true,
  };
  const rule2: IRedditPlatformCommunityRule =
    await api.functional.redditPlatform.communityModerator.communities.rules.create(
      connection,
      {
        communityName: community.name,
        body: rule2Data satisfies IRedditPlatformCommunityRule.ICreate,
      },
    );
  typia.assert(rule2);
  rules.push(rule2);

  // Create rule with priority 3
  const rule3Data = {
    reddit_platform_community_id: community.id,
    title: "Rule 3 - Lowest Priority",
    description: "This is the lowest priority rule in the community",
    rule_type: "posting" as const,
    priority: 3,
    is_active: true,
  };
  const rule3: IRedditPlatformCommunityRule =
    await api.functional.redditPlatform.communityModerator.communities.rules.create(
      connection,
      {
        communityName: community.name,
        body: rule3Data satisfies IRedditPlatformCommunityRule.ICreate,
      },
    );
  typia.assert(rule3);
  rules.push(rule3);

  // Step 7: Update rule2 priority from 2 to 1 (should trigger reordering)
  const updatedRule2: IRedditPlatformCommunityRule =
    await api.functional.redditPlatform.communityModerator.communities.rules.putByCommunitynameAndRuleid(
      connection,
      {
        communityName: community.name,
        ruleId: rule2.id,
        body: {
          priority: 1,
        } satisfies IRedditPlatformCommunityRule.IUpdate,
      },
    );
  typia.assert(updatedRule2);

  // Step 8: Verify priority reordering logic
  // The system should automatically reorder:
  // - updatedRule2: priority 1 (new)
  // - rule1: priority 2 (shifted from 1 to 2)
  // - rule3: priority 3 (unchanged)

  TestValidator.equals(
    "updated rule2 priority should be 1",
    updatedRule2.priority,
    1,
  );
  TestValidator.equals(
    "rule1 priority should be shifted to 2",
    rule1.priority,
    2,
  );
  TestValidator.equals("rule3 priority should remain 3", rule3.priority, 3);

  // Step 9: Test another priority change - move rule3 to priority 1
  const updatedRule3: IRedditPlatformCommunityRule =
    await api.functional.redditPlatform.communityModerator.communities.rules.putByCommunitynameAndRuleid(
      connection,
      {
        communityName: community.name,
        ruleId: rule3.id,
        body: {
          priority: 1,
        } satisfies IRedditPlatformCommunityRule.IUpdate,
      },
    );
  typia.assert(updatedRule3);

  // Final verification - priorities should be:
  // - updatedRule3: priority 1 (new highest)
  // - updatedRule2: priority 2 (shifted from 1 to 2)
  // - rule1: priority 3 (shifted from 2 to 3)

  TestValidator.equals(
    "updated rule3 should have priority 1",
    updatedRule3.priority,
    1,
  );
  TestValidator.equals(
    "updatedRule2 should be shifted to priority 2",
    updatedRule2.priority,
    2,
  );
  TestValidator.equals(
    "rule1 should be shifted to priority 3",
    rule1.priority,
    3,
  );

  // Step 10: Validate priority uniqueness - all rules should have unique priorities
  const prioritySet = new Set([
    updatedRule3.priority,
    updatedRule2.priority,
    rule1.priority,
  ]);
  TestValidator.equals("all priorities should be unique", prioritySet.size, 3);

  // Step 11: Validate priority sequence - should be 1, 2, 3
  const priorities = [
    updatedRule3.priority,
    updatedRule2.priority,
    rule1.priority,
  ].sort((a, b) => a - b);
  TestValidator.equals(
    "priorities should form sequential sequence",
    priorities,
    [1, 2, 3],
  );

  // Step 12: Test boundary condition - try setting priority to highest value (100)
  const highPriorityRule: IRedditPlatformCommunityRule =
    await api.functional.redditPlatform.communityModerator.communities.rules.putByCommunitynameAndRuleid(
      connection,
      {
        communityName: community.name,
        ruleId: rule1.id,
        body: {
          priority: 100,
        } satisfies IRedditPlatformCommunityRule.IUpdate,
      },
    );
  typia.assert(highPriorityRule);

  // Verify that priority 100 is accepted and other rules maintain uniqueness
  TestValidator.equals(
    "high priority rule should have priority 100",
    highPriorityRule.priority,
    100,
  );

  const allPriorities = [
    updatedRule3.priority,
    updatedRule2.priority,
    highPriorityRule.priority,
  ];
  const uniquePriorities = new Set(allPriorities);
  TestValidator.equals(
    "priorities should remain unique with high value",
    uniquePriorities.size,
    3,
  );
}
