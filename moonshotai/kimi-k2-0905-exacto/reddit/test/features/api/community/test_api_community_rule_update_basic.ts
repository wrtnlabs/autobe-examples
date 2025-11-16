import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";
import type { IRedditCommunityCommunityRule } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityRule";

/**
 * Test the complete workflow of updating a community rule by first creating a
 * community moderator account, then creating a community rule, and finally
 * updating the rule with new title, description, and violation consequences.
 * Validates that rule updates are properly applied and accessible to
 * moderators.
 */
export async function test_api_community_rule_update_basic(
  connection: api.IConnection,
) {
  // Step 1: Create community moderator account for authentication
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator = await api.functional.auth.communityModerator.join(
    connection,
    {
      body: {
        email: moderatorEmail,
        password: "SecurePass123!",
        nickname: RandomGenerator.name(),
        href: "https://reddit-community.com",
        referrer: "https://reddit.com",
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IRedditCommunityCommunityModerator.ICreate,
    },
  );
  typia.assert(moderator);

  // Step 2: Create a community with a unique name
  const communityName = `test-community-${RandomGenerator.alphaNumeric(8)}`;

  // Step 3: Create initial community rule
  const initialRuleBody = {
    title: "Be Respectful",
    description:
      "Treat all community members with respect and courtesy. Personal attacks, harassment, or discriminatory language will not be tolerated.",
    violation_consequence:
      "First offense: Warning. Second offense: 3-day suspension. Third offense: Permanent ban.",
  } satisfies IRedditCommunityCommunityRule.ICreate;

  const initialRule =
    await api.functional.redditCommunity.communityModerator.communities.rules.create(
      connection,
      {
        communityName,
        body: initialRuleBody,
      },
    );
  typia.assert(initialRule);

  // Validate initial rule creation
  TestValidator.equals(
    "rule title matches",
    initialRule.title,
    initialRuleBody.title,
  );
  TestValidator.equals(
    "rule description matches",
    initialRule.description,
    initialRuleBody.description,
  );
  TestValidator.equals(
    "rule consequence matches",
    initialRule.violation_consequence,
    initialRuleBody.violation_consequence,
  );
  TestValidator.predicate("rule has valid UUID", () =>
    typia.is<string & tags.Format<"uuid">>(initialRule.id),
  );
  TestValidator.predicate(
    "rule number is between 1-15",
    () => initialRule.rule_number >= 1 && initialRule.rule_number <= 15,
  );

  // Step 4: Update the community rule with new details
  const updatedRuleBody = {
    title: "Maintain Professional Discourse",
    description:
      "Engage in constructive discussions and maintain professional communication standards. Provide evidence-based arguments and respectful criticism.",
    violation_consequence:
      "First offense: Content removal. Second offense: 7-day moderation review required. Third offense: Community expulsion with appeal process.",
    rule_number: initialRule.rule_number, // Keep the same rule number
  } satisfies IRedditCommunityCommunityRule.IUpdate;

  const updatedRule =
    await api.functional.redditCommunity.communityModerator.communities.rules.update(
      connection,
      {
        communityName,
        ruleId: initialRule.id,
        body: updatedRuleBody,
      },
    );
  typia.assert(updatedRule);

  // Step 5: Validate the rule update was successful
  TestValidator.equals(
    "updated rule title matches",
    updatedRule.title,
    updatedRuleBody.title,
  );
  TestValidator.equals(
    "updated rule description matches",
    updatedRule.description,
    updatedRuleBody.description,
  );
  TestValidator.equals(
    "updated rule consequence matches",
    updatedRule.violation_consequence,
    updatedRuleBody.violation_consequence,
  );
  TestValidator.equals(
    "rule ID remains the same",
    updatedRule.id,
    initialRule.id,
  );
  TestValidator.equals(
    "rule number remains the same",
    updatedRule.rule_number,
    initialRule.rule_number,
  );
  TestValidator.equals(
    "community association remains the same",
    updatedRule.reddit_community_community_id,
    initialRule.reddit_community_community_id,
  );
  TestValidator.notEquals(
    "updated timestamp should be different",
    updatedRule.updated_at,
    initialRule.updated_at,
  );
  TestValidator.equals(
    "creation timestamp should remain the same",
    updatedRule.created_at,
    initialRule.created_at,
  );

  // Step 6: Verify rule properties meet business requirements
  TestValidator.predicate(
    "rule title is within length limit",
    () => updatedRule.title.length <= 100,
  );
  TestValidator.predicate(
    "rule description is within length limit",
    () => updatedRule.description.length <= 1000,
  );
  TestValidator.predicate(
    "rule consequence is within length limit",
    () =>
      updatedRule.violation_consequence !== undefined &&
      updatedRule.violation_consequence.length <= 200,
  );
}
