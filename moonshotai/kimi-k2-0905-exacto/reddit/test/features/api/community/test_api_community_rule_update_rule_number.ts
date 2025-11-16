import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";
import type { IRedditCommunityCommunityRule } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityRule";

/**
 * Test updating only the rule number to verify sequential ordering is
 * maintained when rules are reordered. Validates that rule numbering changes
 * don't affect other rule properties and that communities can maintain logical
 * rule organization.
 *
 * This test establishes community moderator authentication and creates a
 * community rule, then tests updating the rule number while verifying that all
 * other rule properties remain unchanged. The test validates:
 *
 * - Authentication setup for community moderator permissions
 * - Rule creation with initial numbering
 * - Rule number updates maintaining sequential integrity
 * - Rule number edge cases (maximum value 15)
 * - Property preservation during reordering operations
 */
export async function test_api_community_rule_update_rule_number(
  connection: api.IConnection,
) {
  // Step 1: Establish community moderator authentication
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator: IRedditCommunityCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.join(connection, {
      body: {
        email: moderatorEmail,
        password: "SecurePass123!",
        nickname: RandomGenerator.name(),
        href: "https://reddit-community.example.com/register",
        referrer: "https://reddit-community.example.com",
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IRedditCommunityCommunityModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 2: Create a community name for testing
  const communityName = RandomGenerator.name();

  // Step 3: Create a foundational rule with initial rule number
  const ruleData = {
    title: "No spam or self-promotion",
    description:
      "Posts and comments should be relevant to community discussions. Self-promotional content is only allowed in designated threads.",
    violation_consequence: "Post removal and warning",
  };

  const initialRule: IRedditCommunityCommunityRule =
    await api.functional.redditCommunity.communityModerator.communities.rules.create(
      connection,
      {
        communityName: communityName,
        body: ruleData satisfies IRedditCommunityCommunityRule.ICreate,
      },
    );
  typia.assert(initialRule);

  // Validate initial rule state
  TestValidator.equals("initial rule title", initialRule.title, ruleData.title);
  TestValidator.equals(
    "initial rule description",
    initialRule.description,
    ruleData.description,
  );
  TestValidator.equals("initial rule number", initialRule.rule_number, 1);
  TestValidator.equals(
    "initial rule consequence",
    initialRule.violation_consequence,
    ruleData.violation_consequence,
  );

  // Step 4: Update only the rule number to re-order the rule (from rule_number 1 to rule_number 5)
  const newRuleNumber = 5;
  const updatedRule: IRedditCommunityCommunityRule =
    await api.functional.redditCommunity.communityModerator.communities.rules.update(
      connection,
      {
        communityName: communityName,
        ruleId: initialRule.id,
        body: {
          title: initialRule.title,
          description: initialRule.description,
          rule_number: newRuleNumber,
          violation_consequence: initialRule.violation_consequence,
        } satisfies IRedditCommunityCommunityRule.IUpdate,
      },
    );
  typia.assert(updatedRule);

  // Step 5: Verify that only the rule number changed while other properties remain unchanged
  TestValidator.equals(
    "rule title unchanged",
    updatedRule.title,
    initialRule.title,
  );
  TestValidator.equals(
    "rule description unchanged",
    updatedRule.description,
    initialRule.description,
  );
  TestValidator.equals(
    "rule consequence unchanged",
    updatedRule.violation_consequence,
    initialRule.violation_consequence,
  );
  TestValidator.notEquals(
    "rule number changed",
    updatedRule.rule_number,
    initialRule.rule_number,
  );
  TestValidator.equals(
    "rule number updated correctly",
    updatedRule.rule_number,
    newRuleNumber,
  );
  TestValidator.equals("rule ID unchanged", updatedRule.id, initialRule.id);
  TestValidator.equals(
    "community ID unchanged",
    updatedRule.reddit_community_community_id,
    initialRule.reddit_community_community_id,
  );

  // Step 6: Test edge case by updating rule number to maximum allowed value (15)
  const maxRuleNumber = 15;
  const edgeCaseUpdatedRule: IRedditCommunityCommunityRule =
    await api.functional.redditCommunity.communityModerator.communities.rules.update(
      connection,
      {
        communityName: communityName,
        ruleId: updatedRule.id,
        body: {
          title: updatedRule.title,
          description: updatedRule.description,
          rule_number: maxRuleNumber,
          violation_consequence: updatedRule.violation_consequence,
        } satisfies IRedditCommunityCommunityRule.IUpdate,
      },
    );
  typia.assert(edgeCaseUpdatedRule);

  // Validate edge case update
  TestValidator.equals(
    "rule number at maximum",
    edgeCaseUpdatedRule.rule_number,
    maxRuleNumber,
  );
  TestValidator.predicate(
    "max rule number within valid range",
    edgeCaseUpdatedRule.rule_number >= 1 &&
      edgeCaseUpdatedRule.rule_number <= 15,
  );

  // Verify all other properties unchanged for edge case
  TestValidator.equals(
    "rule title unchanged in edge case",
    edgeCaseUpdatedRule.title,
    updatedRule.title,
  );
  TestValidator.equals(
    "rule description unchanged in edge case",
    edgeCaseUpdatedRule.description,
    updatedRule.description,
  );
  TestValidator.equals(
    "rule consequence unchanged in edge case",
    edgeCaseUpdatedRule.violation_consequence,
    updatedRule.violation_consequence,
  );

  // Step 7: Test updating rule number back to a lower value to verify bidirectional reordering
  const finalRuleNumber = 3;
  const finalReorderedRule: IRedditCommunityCommunityRule =
    await api.functional.redditCommunity.communityModerator.communities.rules.update(
      connection,
      {
        communityName: communityName,
        ruleId: edgeCaseUpdatedRule.id,
        body: {
          title: edgeCaseUpdatedRule.title,
          description: edgeCaseUpdatedRule.description,
          rule_number: finalRuleNumber,
          violation_consequence: edgeCaseUpdatedRule.violation_consequence,
        } satisfies IRedditCommunityCommunityRule.IUpdate,
      },
    );
  typia.assert(finalReorderedRule);

  // Validate final reordering
  TestValidator.equals(
    "rule number reordered to 3",
    finalReorderedRule.rule_number,
    finalRuleNumber,
  );
  TestValidator.predicate(
    "final rule number within valid range",
    finalReorderedRule.rule_number >= 1 && finalReorderedRule.rule_number <= 15,
  );

  // Final validation: Verify rule properties integrity across all updates
  TestValidator.predicate(
    "all rule properties remain consistent across updates",
    finalReorderedRule.title === ruleData.title &&
      finalReorderedRule.description === ruleData.description &&
      finalReorderedRule.violation_consequence ===
        ruleData.violation_consequence,
  );
}
