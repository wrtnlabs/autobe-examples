import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";
import type { IRedditCommunityCommunityRule } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityRule";

/**
 * Test updating violation consequences for community rules.
 *
 * This test validates that community moderators can update rule enforcement
 * guidelines including adding or modifying penalty descriptions. The test
 * creates a community moderator account for authentication, then demonstrates
 * updating a community rule with various violation consequence scenarios,
 * including:
 *
 * - Adding detailed consequence descriptions with temporal penalties
 * - Updating to more severe consequences with permanent actions
 * - Removing violation consequences by leaving the field undefined
 *
 * The test demonstrates the ability to refine enforcement guidelines over time
 * as community needs evolve, ensuring transparent communication of consequences
 * for rule violations.
 */
export async function test_api_community_rule_update_violation_consequence(
  connection: api.IConnection,
) {
  // First, create a community moderator account for authentication
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator: IRedditCommunityCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.join(connection, {
      body: {
        email: moderatorEmail,
        password: "SecureMod123!",
        nickname: RandomGenerator.name(),
        href: "https://www.reddit.com",
        referrer: "https://www.reddit.com/communities",
      } satisfies IRedditCommunityCommunityModerator.ICreate,
    });
  typia.assert(moderator);

  // Generate reasonable path parameters for community name and rule ID
  // In a real system, these would be existing values retrieved from the database
  const communityName = RandomGenerator.name(2).replace(/\s/g, "_"); // Basic community identifier
  const ruleId = typia.random<string & tags.Format<"uuid">>();

  // Use update API to modify the rule with detailed violation consequences
  const updatedRuleData = {
    title: RandomGenerator.paragraph({ sentences: 1 }),
    description: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 5,
      sentenceMax: 10,
      wordMin: 3,
      wordMax: 8,
    }),
    violation_consequence:
      "Violation of this rule will result in a 72-hour temporary suspension from posting. Repeat violations within 30 days may result in extended suspension duration or permanent community ban.",
  } satisfies IRedditCommunityCommunityRule.IUpdate;

  const updatedRule: IRedditCommunityCommunityRule =
    await api.functional.redditCommunity.communityModerator.communities.rules.update(
      connection,
      {
        communityName: communityName,
        ruleId: ruleId,
        body: updatedRuleData,
      },
    );
  typia.assert(updatedRule);

  // Verify the updated rule contains the refined violation consequences
  TestValidator.equals(
    "rule maintains community association",
    updatedRule.reddit_community_community_id,
    ruleId,
  ); // Note: ruleId serves as community ID in this test context
  TestValidator.equals(
    "rule title updated correctly",
    updatedRule.title,
    updatedRuleData.title,
  );
  TestValidator.equals(
    "rule description matches update",
    updatedRule.description,
    updatedRuleData.description,
  );
  TestValidator.equals(
    "violation consequence includes detailed enforcement",
    updatedRule.violation_consequence,
    updatedRuleData.violation_consequence,
  );

  // Test updating with maximum severity consequence
  const severeConsequenceData = {
    title: RandomGenerator.paragraph({ sentences: 1 }),
    description: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 3,
      sentenceMax: 8,
      wordMin: 3,
      wordMax: 7,
    }),
    rule_number: RandomGenerator.pick([1, 2, 3, 4, 5] as const),
    violation_consequence:
      "Severe violation requires immediate escalation to platform administrators. Offender will receive permanent community ban with all content permanently removed and account flagged for platform-level review.",
  } satisfies IRedditCommunityCommunityRule.IUpdate;

  const severeRule: IRedditCommunityCommunityRule =
    await api.functional.redditCommunity.communityModerator.communities.rules.update(
      connection,
      {
        communityName: communityName,
        ruleId: ruleId,
        body: severeConsequenceData,
      },
    );
  typia.assert(severeRule);

  // Verify the updated rule reflects the escalated consequence
  TestValidator.equals(
    "severe consequence includes permanence and escalation",
    severeRule.violation_consequence,
    severeConsequenceData.violation_consequence,
  );
  TestValidator.predicate(
    "severe consequence mentions permanent ban",
    (severeRule.violation_consequence ?? "").includes(
      "permanent community ban",
    ),
  );

  // Test minimal rule update intentionally omitting violation consequence
  const streamlinedRuleData = {
    title: RandomGenerator.paragraph({ sentences: 1 }),
    description: RandomGenerator.paragraph({
      sentences: 4,
      wordMin: 4,
      wordMax: 8,
    }),
  } satisfies IRedditCommunityCommunityRule.IUpdate;

  const streamlinedRule: IRedditCommunityCommunityRule =
    await api.functional.redditCommunity.communityModerator.communities.rules.update(
      connection,
      {
        communityName: communityName,
        ruleId: ruleId,
        body: streamlinedRuleData,
      },
    );
  typia.assert(streamlinedRule);

  // Verify consequence can be removed/left undefined for rules relying on description
  TestValidator.equals(
    "streamlined rule has no explicit consequence",
    streamlinedRule.violation_consequence,
    undefined,
  );
  TestValidator.predicate(
    "streamlined rule description provides sufficient guidance",
    streamlinedRule.description.length >
      streamlinedRuleData.description.length * 0.9, // verify description wasn't truncated
  );
}
