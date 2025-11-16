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
 * Test comprehensive validation of community rule data including required
 * fields, data types, and content integrity when moderators retrieve rules.
 *
 * This test ensures that rule information contains all required elements
 * (title, description, rule number, violation consequence) and that data
 * formatting aligns with community governance standards. The test also
 * validates proper error handling for non-existent rules or invalid
 * community/rule combinations.
 *
 * Step-by-step process:
 *
 * 1. Create community moderator account for authentication
 * 2. Create member account to establish community ownership
 * 3. Create a community with complete configuration
 * 4. Create a rule with all required fields including title, description, and
 *    violation consequence
 * 5. Retrieve the rule and validate all required fields are present and properly
 *    formatted
 * 6. Test error handling with non-existent rule ID
 * 7. Test error handling with invalid community name
 */
export async function test_api_community_rule_validation_by_moderator(
  connection: api.IConnection,
) {
  // 1. Create community moderator account for authentication
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator = await api.functional.auth.communityModerator.join(
    connection,
    {
      body: {
        email: moderatorEmail,
        password: "SecurePass123!",
        nickname: RandomGenerator.name(),
        href: "https://reddit-community.com/join",
        referrer: "https://reddit-community.com/",
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IRedditCommunityCommunityModerator.ICreate,
    },
  );
  typia.assert(moderator);

  // 2. Create member account to establish community
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member = await api.functional.auth.member.join(connection, {
    body: {
      nickname: RandomGenerator.name(),
      email: memberEmail,
      password: "MemberPass123!",
    } satisfies IRedditCommunityMember.ICreate,
  });
  typia.assert(member);

  // 3. Create a community with complete data
  const communityName = RandomGenerator.alphabets(10).toLowerCase();
  const community =
    await api.functional.redditCommunity.member.communities.create(connection, {
      body: {
        name: communityName,
        title: RandomGenerator.paragraph({ sentences: 3 }),
        description: RandomGenerator.content({
          paragraphs: 2,
          sentenceMin: 5,
          sentenceMax: 10,
        }),
        category_name: "Technology",
        type: "public",
        post_requirement_min_age: 7,
        post_requirement_min_karma: 10,
        allow_crosspost: true,
      } satisfies IRedditCommunityCommunity.ICreate,
    });
  typia.assert(community);

  // 4. Create a rule with complete data including violation consequence
  const ruleTitle = RandomGenerator.paragraph({
    sentences: 1,
    wordMin: 3,
    wordMax: 8,
  });
  const ruleDescription = RandomGenerator.content({
    paragraphs: 1,
    sentenceMin: 3,
    sentenceMax: 6,
  });
  const rule =
    await api.functional.redditCommunity.communityModerator.communities.rules.create(
      connection,
      {
        communityName: community.name,
        body: {
          title: ruleTitle,
          description: ruleDescription,
          violation_consequence:
            "First offense: Warning. Repeated violations: Post removal and temporary ban.",
        } satisfies IRedditCommunityCommunityRule.ICreate,
      },
    );
  typia.assert(rule);

  // 5. Retrieve the rule and validate all required fields
  const retrievedRule =
    await api.functional.redditCommunity.communityModerator.communities.rules.at(
      connection,
      {
        communityName: community.name,
        ruleId: rule.id,
      },
    );
  typia.assert(retrievedRule);

  // Validate all required fields are present and properly formatted
  TestValidator.equals("rule title matches", retrievedRule.title, ruleTitle);
  TestValidator.equals(
    "rule description matches",
    retrievedRule.description,
    ruleDescription,
  );
  TestValidator.equals("rule ID matches", retrievedRule.id, rule.id);
  TestValidator.equals(
    "community ID matches",
    retrievedRule.reddit_community_community_id,
    community.id,
  );
  TestValidator.predicate(
    "rule number is valid",
    retrievedRule.rule_number >= 1 && retrievedRule.rule_number <= 15,
  );
  TestValidator.equals(
    "violation consequence matches",
    retrievedRule.violation_consequence,
    "First offense: Warning. Repeated violations: Post removal and temporary ban.",
  );
  TestValidator.predicate(
    "created_at is valid ISO date",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(retrievedRule.created_at),
  );
  TestValidator.predicate(
    "updated_at is valid ISO date",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(retrievedRule.updated_at),
  );

  // 6. Test error handling with non-existent rule ID
  const nonExistentRuleId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "should fail with non-existent rule ID",
    async () => {
      await api.functional.redditCommunity.communityModerator.communities.rules.at(
        connection,
        {
          communityName: community.name,
          ruleId: nonExistentRuleId,
        },
      );
    },
  );

  // 7. Test error handling with invalid community name
  const invalidCommunityName = RandomGenerator.alphabets(10).toLowerCase();
  await TestValidator.error(
    "should fail with invalid community name",
    async () => {
      await api.functional.redditCommunity.communityModerator.communities.rules.at(
        connection,
        {
          communityName: invalidCommunityName,
          ruleId: rule.id,
        },
      );
    },
  );
}
