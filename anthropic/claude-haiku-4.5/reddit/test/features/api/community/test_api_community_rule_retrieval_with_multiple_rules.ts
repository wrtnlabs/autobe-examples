import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityRule } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityRule";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";

export async function test_api_community_rule_retrieval_with_multiple_rules(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate an administrator
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password: "AdminPassword123!",
        username: RandomGenerator.alphabets(8),
        name: RandomGenerator.name(),
        href: "https://example.com/admin/join",
        referrer: "https://example.com",
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(admin);

  // Step 2: Create a category for the community
  const category: ICommunityPlatformCategory =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: "Technology",
          slug: "technology",
          description: "Technology discussions and news",
          display_order: 1,
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category);

  // Step 3: Create and authenticate a member as community creator
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        username: RandomGenerator.alphabets(8),
        password: "MemberPassword123!",
        href: "https://example.com/member/join",
        referrer: "https://example.com",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member);

  // Step 4: Create a community
  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: "Tech Discussion Community",
          identifier: `tech_${RandomGenerator.alphaNumeric(6)}`,
          description: "A community for technology discussions",
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
          category_slug: category.slug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Step 5: Create and authenticate a moderator
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator: ICommunityPlatformModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        username: RandomGenerator.alphabets(8),
        password: "ModeratorPassword123!",
        href: "https://example.com/moderator/join",
        referrer: "https://example.com",
      } satisfies ICommunityPlatformModerator.ICreate,
    });
  typia.assert(moderator);

  // Switch to moderator context
  await api.functional.auth.moderator.login(connection, {
    body: {
      email: moderatorEmail,
      password: "ModeratorPassword123!",
      href: "https://example.com/moderator/login",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformModerator.ILogin,
  });

  // Step 6: Create multiple rules (1-5) for the community
  const rules: ICommunityPlatformCommunityRule[] = [];

  const ruleTexts = [
    {
      title: "Be Respectful",
      description:
        "Treat all members with respect and courtesy in all interactions.",
    },
    {
      title: "No Spam",
      description:
        "Do not post promotional content, advertisements, or spam messages.",
    },
    {
      title: "Stay On Topic",
      description:
        "Keep discussions relevant to technology and computing topics.",
    },
    {
      title: "No Harassment",
      description: "Do not target, insult, or mock other community members.",
    },
    {
      title: "Share Knowledge",
      description:
        "Contribute positively by sharing knowledge and helping others learn.",
    },
  ];

  for (let i = 0; i < 5; i++) {
    const ruleNumber = i + 1;
    const rule: ICommunityPlatformCommunityRule =
      await api.functional.communityPlatform.moderator.communities.rules.create(
        connection,
        {
          communityId: community.id,
          body: {
            rule_number: ruleNumber,
            title: ruleTexts[i].title,
            description: ruleTexts[i].description,
          } satisfies ICommunityPlatformCommunityRule.ICreate,
        },
      );
    typia.assert(rule);
    rules.push(rule);
  }

  // Step 7: Retrieve each rule individually and validate
  for (let i = 0; i < 5; i++) {
    const retrievedRule: ICommunityPlatformCommunityRule =
      await api.functional.communityPlatform.communities.rules.at(connection, {
        communityId: community.id,
        ruleId: rules[i].id,
      });
    typia.assert(retrievedRule);

    // Validate rule content matches
    TestValidator.equals(
      `rule ${i + 1} title matches`,
      retrievedRule.title,
      ruleTexts[i].title,
    );
    TestValidator.equals(
      `rule ${i + 1} description matches`,
      retrievedRule.description,
      ruleTexts[i].description,
    );
    TestValidator.equals(
      `rule ${i + 1} number matches`,
      retrievedRule.rule_number,
      i + 1,
    );
  }

  // Step 8: Validate rule isolation - Rule 3 should not return Rule 2 or Rule 4 content
  const rule3: ICommunityPlatformCommunityRule =
    await api.functional.communityPlatform.communities.rules.at(connection, {
      communityId: community.id,
      ruleId: rules[2].id,
    });
  typia.assert(rule3);

  TestValidator.notEquals(
    "rule 3 title should not match rule 2 title",
    rule3.title,
    ruleTexts[1].title,
  );
  TestValidator.notEquals(
    "rule 3 title should not match rule 4 title",
    rule3.title,
    ruleTexts[3].title,
  );
  TestValidator.equals(
    "rule 3 should have correct title",
    rule3.title,
    ruleTexts[2].title,
  );

  // Step 9: Test rules from different ordinal positions
  const rule1: ICommunityPlatformCommunityRule =
    await api.functional.communityPlatform.communities.rules.at(connection, {
      communityId: community.id,
      ruleId: rules[0].id,
    });
  typia.assert(rule1);
  TestValidator.equals("rule 1 position correct", rule1.rule_number, 1);

  const rule5: ICommunityPlatformCommunityRule =
    await api.functional.communityPlatform.communities.rules.at(connection, {
      communityId: community.id,
      ruleId: rules[4].id,
    });
  typia.assert(rule5);
  TestValidator.equals("rule 5 position correct", rule5.rule_number, 5);

  TestValidator.notEquals(
    "rule 1 should differ from rule 5",
    rule1.title,
    rule5.title,
  );
}
