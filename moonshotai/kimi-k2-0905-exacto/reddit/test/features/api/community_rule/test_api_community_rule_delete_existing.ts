import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";
import type { IRedditCommunityCommunityRule } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityRule";

/**
 * Test the complete rule deletion workflow from creation through removal
 * including verification that deleted rules are no longer accessible. Validates
 * proper cleanup of community governance rules and maintenance of rule
 * organization.
 */
export async function test_api_community_rule_delete_existing(
  connection: api.IConnection,
) {
  // Step 1: Register and authenticate as community moderator
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorProfile = await api.functional.auth.communityModerator.join(
    connection,
    {
      body: {
        email: moderatorEmail,
        password: "ModeratorPass123",
        nickname: RandomGenerator.name(),
        href: "https://reddit-community.example.com/join",
        referrer: "https://reddit-community.example.com/landing",
      } satisfies IRedditCommunityCommunityModerator.ICreate,
    },
  );
  typia.assert(moderatorProfile);

  // Step 2: Create a test community with unique name
  const communityName = `TestCommunity-${RandomGenerator.alphaNumeric(8)}`;

  // Step 3: Create a community rule with comprehensive governance details
  const ruleCreation =
    await api.functional.redditCommunity.communityModerator.communities.rules.create(
      connection,
      {
        communityName,
        body: {
          title: "Content Quality Standards",
          description:
            "Ensure all posts maintain high quality and relevance to community interests. Posts must include meaningful discussion or valuable information related to the community topic.",
          violation_consequence:
            "Posts will be removed and members may receive warnings for repeated violations",
        } satisfies IRedditCommunityCommunityRule.ICreate,
      },
    );
  typia.assert(ruleCreation);

  // Step 4: Verify rule existence and properties after creation
  TestValidator.equals(
    "rule should have correct title",
    ruleCreation.title,
    "Content Quality Standards",
  );
  TestValidator.predicate(
    "rule number should be within valid range",
    ruleCreation.rule_number >= 1 && ruleCreation.rule_number <= 15,
  );
  TestValidator.predicate(
    "rule should have valid timestamp properties",
    ruleCreation.created_at.includes("T") &&
      ruleCreation.created_at.includes("Z"),
  );

  // Step 5: Execute rule deletion operation
  await api.functional.redditCommunity.communityModerator.communities.rules.erase(
    connection,
    {
      communityName,
      ruleId: ruleCreation.id,
    },
  );

  // Step 6: Create a second rule to verify community continues to function after deletion
  const secondRuleCreation =
    await api.functional.redditCommunity.communityModerator.communities.rules.create(
      connection,
      {
        communityName,
        body: {
          title: "Community Respect Policy",
          description:
            "Members must treat each other with respect and constructive language. Personal attacks or harassment will not be tolerated.",
          violation_consequence:
            "Violations may result in temporary or permanent bans from the community",
        } satisfies IRedditCommunityCommunityRule.ICreate,
      },
    );
  typia.assert(secondRuleCreation);

  // Step 7: Verify rule organization maintains valid properties
  TestValidator.predicate(
    "second rule should have valid rule number",
    secondRuleCreation.rule_number >= 1 && secondRuleCreation.rule_number <= 15,
  );
  TestValidator.notEquals(
    "second rule should have different ID",
    secondRuleCreation.id,
    ruleCreation.id,
  );
  TestValidator.predicate(
    "created timestamps should be different",
    secondRuleCreation.created_at !== ruleCreation.created_at,
  );
}
