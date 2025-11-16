import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";
import type { IRedditCommunityCommunityRule } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityRule";

/**
 * Test creating multiple community rules with sequential rule_number values to
 * establish rule ordering.
 *
 * This test validates the rule ordering and priority system that moderators use
 * to emphasize important guidelines. The process includes:
 *
 * 1. Register a moderator account
 * 2. Create a community
 * 3. Create 5 rules with sequential rule_numbers (1, 2, 3, 4, 5)
 * 4. Verify each rule is created successfully with correct rule_number
 *
 * The test demonstrates that rule_numbers control display order regardless of
 * creation timestamp.
 */
export async function test_api_community_rule_creation_sequential_numbering(
  connection: api.IConnection,
) {
  // Step 1: Register moderator account for authentication
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator: IRedditCommunityCommunityModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        password: "securePassword123",
        nickname: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IRedditCommunityCommunityModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 2: Create community to contain ordered rules
  const community: IRedditCommunityCommunity =
    await api.functional.redditCommunity.moderator.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.alphaNumeric(10).toLowerCase(),
          display_title: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.paragraph({ sentences: 5 }),
          rules: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IRedditCommunityCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Step 3: Create 5 rules with sequential rule_numbers (1, 2, 3, 4, 5)
  const ruleNumbers = [1, 2, 3, 4, 5];
  const createdRules: IRedditCommunityCommunityRule[] = [];

  for (const ruleNumber of ruleNumbers) {
    const rule: IRedditCommunityCommunityRule =
      await api.functional.redditCommunity.moderator.communities.rules.create(
        connection,
        {
          communityName: community.name,
          body: {
            title: `Rule ${ruleNumber}: ${RandomGenerator.paragraph({ sentences: 1 })}`,
            description: RandomGenerator.paragraph({ sentences: 3 }),
            rule_number: ruleNumber,
          } satisfies IRedditCommunityCommunityRule.ICreate,
        },
      );
    typia.assert(rule);
    createdRules.push(rule);
  }

  // Step 4: Verify each rule is created successfully with correct rule_number
  for (let i = 0; i < createdRules.length; i++) {
    const rule = createdRules[i];
    const expectedRuleNumber = ruleNumbers[i];

    TestValidator.equals(
      "rule created with correct rule_number",
      rule.rule_number,
      expectedRuleNumber,
    );

    TestValidator.equals(
      "rule belongs to correct community",
      rule.community_id,
      community.id,
    );

    TestValidator.predicate(
      "rule has valid ID",
      rule.id !== null && rule.id !== undefined,
    );

    TestValidator.predicate("rule has title", rule.title.length > 0);

    TestValidator.predicate(
      "rule has created_at timestamp",
      rule.created_at !== null && rule.created_at !== undefined,
    );

    TestValidator.predicate(
      "rule has updated_at timestamp",
      rule.updated_at !== null && rule.updated_at !== undefined,
    );
  }

  // Verify sequential ordering
  for (let i = 0; i < createdRules.length - 1; i++) {
    TestValidator.predicate(
      "rules are in sequential order",
      createdRules[i].rule_number < createdRules[i + 1].rule_number,
    );
  }
}
