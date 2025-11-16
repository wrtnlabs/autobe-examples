import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityCategories } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityCategories";
import type { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";
import type { IRedditCommunityCommunityRule } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityRule";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";

/**
 * Test creation of more than 15 rules in a single community.
 *
 * This scenario validates that the system enforces the maximum rule limit per
 * community, ensuring communities maintain focused, manageable governance
 * guidelines rather than overly complex rule systems.
 *
 * Test steps:
 *
 * 1. Create a member user for community creation
 * 2. Create a community with appropriate settings
 * 3. Create a community moderator for rule management
 * 4. Authenticate the moderator
 * 5. Create rules up to the maximum limit (15)
 * 6. Verify the 16th rule creation fails appropriately
 */
export async function test_api_community_rule_creation_rule_limit_exceeded(
  connection: api.IConnection,
) {
  // Create initial member user to create community
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberNickname = RandomGenerator.name();

  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      nickname: memberNickname,
      password: "password123",
    } satisfies IRedditCommunityMember.ICreate,
  });
  typia.assert(member);

  // Create member login for authentication
  await api.functional.auth.member.login(connection, {
    body: {
      email: memberEmail,
      password: "password123",
      href: "https://example.com",
      referrer: "https://example.com",
      ip: null,
    } satisfies IRedditCommunityMember.ILoginRequest,
  });

  // Create community
  const communityName = `test_community_${RandomGenerator.alphabets(10)}`;
  const community =
    await api.functional.redditCommunity.member.communities.create(connection, {
      body: {
        name: communityName,
        title: RandomGenerator.name(2),
        description: RandomGenerator.paragraph({ sentences: 5 }),
        category_name: "technology",
        type: "public",
        allow_crosspost: false,
      } satisfies IRedditCommunityCommunity.ICreate,
    });
  typia.assert(community);

  // Create community moderator
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorNickname = RandomGenerator.name();

  const moderator = await api.functional.auth.communityModerator.join(
    connection,
    {
      body: {
        email: moderatorEmail,
        nickname: moderatorNickname,
        password: "password123",
        href: "https://example.com",
        referrer: "https://example.com",
        ip: null,
      } satisfies IRedditCommunityCommunityModerator.ICreate,
    },
  );
  typia.assert(moderator);

  // Login as community moderator
  await api.functional.auth.communityModerator.login(connection, {
    body: {
      email: moderatorEmail,
      password: "password123",
      href: "https://example.com",
      referrer: "https://example.com",
      ip: null,
    } satisfies IRedditCommunityCommunityModerator.ILogin,
  });

  // Create exactly 15 rules (the maximum allowed)
  const createdRules: IRedditCommunityCommunityRule[] = [];

  for (let i = 1; i <= 15; i++) {
    const ruleTitle = `Rule ${i}: ${RandomGenerator.name(1)}`;
    const ruleDescription = `This is rule number ${i}. ${RandomGenerator.paragraph({ sentences: 3 })}`;
    const violationConsequence = `Violation of rule ${i} will result in immediate action.`;

    const rule =
      await api.functional.redditCommunity.communityModerator.communities.rules.create(
        connection,
        {
          communityName: communityName,
          body: {
            title: ruleTitle,
            description: ruleDescription,
            violation_consequence: violationConsequence,
          } satisfies IRedditCommunityCommunityRule.ICreate,
        },
      );
    typia.assert(rule);

    // Verify rule number is correctly assigned
    TestValidator.equals(
      `rule ${i} number should be ${i}`,
      rule.rule_number,
      i,
    );
    createdRules.push(rule);
  }

  // Verify we have exactly 15 rules
  TestValidator.equals("should have created 15 rules", createdRules.length, 15);

  // Use a simple boolean check instead of predicate for rule numbers
  const allRuleNumbersCorrect = createdRules.every(
    (rule, index) => rule.rule_number === index + 1,
  );
  TestValidator.predicate("rule numbers should be 1-15", allRuleNumbersCorrect);

  // Attempt to create a 16th rule and verify it fails
  await TestValidator.error("creation of 16th rule should fail", async () => {
    await api.functional.redditCommunity.communityModerator.communities.rules.create(
      connection,
      {
        communityName: communityName,
        body: {
          title: "Rule 16: Should Fail",
          description:
            "This rule should not be created as it exceeds the limit.",
          violation_consequence: "This rule creation should fail.",
        } satisfies IRedditCommunityCommunityRule.ICreate,
      },
    );
  });
}
