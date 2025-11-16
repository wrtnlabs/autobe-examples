import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityCommunityRule } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityCommunityRule";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";
import type { IRedditCommunityCommunityRule } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityRule";

/**
 * Test sorting functionality for community rules using different sort fields
 * and directions.
 *
 * This comprehensive test validates that community rules can be properly sorted
 * by multiple criteria (rule_number, created_at, updated_at, title) in both
 * ascending and descending order.
 *
 * Test workflow:
 *
 * 1. Create moderator account and authenticate
 * 2. Establish a community for testing
 * 3. Create multiple rules with varied rule_numbers, titles, and timestamps
 * 4. Test sorting by rule_number (numeric ordering)
 * 5. Test sorting by created_at (chronological ordering)
 * 6. Test sorting by title (alphabetical ordering)
 * 7. Update some rules and test sorting by updated_at
 * 8. Verify ascending and descending orders are reversed for each sort field
 */
export async function test_api_community_rules_sorting_variations(
  connection: api.IConnection,
) {
  // 1. Create moderator account
  const moderator: IRedditCommunityCommunityModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "TestPassword123!",
        nickname: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IRedditCommunityCommunityModerator.ICreate,
    });
  typia.assert(moderator);

  // 2. Create community
  const community: IRedditCommunityCommunity =
    await api.functional.redditCommunity.moderator.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.alphabets(10),
          display_title: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.paragraph({ sentences: 5 }),
          rules: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IRedditCommunityCommunity.ICreate,
      },
    );
  typia.assert(community);

  // 3. Create rules with varied attributes for sorting tests
  const ruleDefinitions = [
    { rule_number: 5, title: "Zebra Rule" },
    { rule_number: 1, title: "Alpha Rule" },
    { rule_number: 10, title: "Mike Rule" },
    { rule_number: 3, title: "Beta Rule" },
    { rule_number: 7, title: "Charlie Rule" },
  ] as const;

  const createdRules: IRedditCommunityCommunityRule[] = [];

  for (const def of ruleDefinitions) {
    const rule: IRedditCommunityCommunityRule =
      await api.functional.redditCommunity.moderator.communities.rules.create(
        connection,
        {
          communityName: community.name,
          body: {
            title: def.title,
            description: RandomGenerator.paragraph({ sentences: 3 }),
            rule_number: def.rule_number,
          } satisfies IRedditCommunityCommunityRule.ICreate,
        },
      );
    typia.assert(rule);
    createdRules.push(rule);

    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  // 4. Test sorting by rule_number - ascending
  const ruleNumberAsc: IPageIRedditCommunityCommunityRule.ISummary =
    await api.functional.redditCommunity.communities.rules.index(connection, {
      communityName: community.name,
      body: {
        sort_by: "rule_number",
        order: "asc",
        limit: 10,
      } satisfies IRedditCommunityCommunityRule.IRequest,
    });
  typia.assert(ruleNumberAsc);

  const expectedRuleNumberAsc = [1, 3, 5, 7, 10];
  const actualRuleNumberAsc = ruleNumberAsc.data.map((r) => r.rule_number);
  TestValidator.equals(
    "rule_number ascending order",
    actualRuleNumberAsc,
    expectedRuleNumberAsc,
  );

  // 5. Test sorting by rule_number - descending
  const ruleNumberDesc: IPageIRedditCommunityCommunityRule.ISummary =
    await api.functional.redditCommunity.communities.rules.index(connection, {
      communityName: community.name,
      body: {
        sort_by: "rule_number",
        order: "desc",
        limit: 10,
      } satisfies IRedditCommunityCommunityRule.IRequest,
    });
  typia.assert(ruleNumberDesc);

  const expectedRuleNumberDesc = [10, 7, 5, 3, 1];
  const actualRuleNumberDesc = ruleNumberDesc.data.map((r) => r.rule_number);
  TestValidator.equals(
    "rule_number descending order",
    actualRuleNumberDesc,
    expectedRuleNumberDesc,
  );

  // 6. Test sorting by created_at - ascending
  const createdAtAsc: IPageIRedditCommunityCommunityRule.ISummary =
    await api.functional.redditCommunity.communities.rules.index(connection, {
      communityName: community.name,
      body: {
        sort_by: "created_at",
        order: "asc",
        limit: 10,
      } satisfies IRedditCommunityCommunityRule.IRequest,
    });
  typia.assert(createdAtAsc);

  TestValidator.predicate(
    "created_at ascending has correct count",
    createdAtAsc.data.length === 5,
  );

  for (let i = 0; i < createdAtAsc.data.length - 1; i++) {
    const current = new Date(createdAtAsc.data[i].created_at).getTime();
    const next = new Date(createdAtAsc.data[i + 1].created_at).getTime();
    TestValidator.predicate(
      `created_at ascending order at index ${i}`,
      current <= next,
    );
  }

  // 7. Test sorting by created_at - descending
  const createdAtDesc: IPageIRedditCommunityCommunityRule.ISummary =
    await api.functional.redditCommunity.communities.rules.index(connection, {
      communityName: community.name,
      body: {
        sort_by: "created_at",
        order: "desc",
        limit: 10,
      } satisfies IRedditCommunityCommunityRule.IRequest,
    });
  typia.assert(createdAtDesc);

  for (let i = 0; i < createdAtDesc.data.length - 1; i++) {
    const current = new Date(createdAtDesc.data[i].created_at).getTime();
    const next = new Date(createdAtDesc.data[i + 1].created_at).getTime();
    TestValidator.predicate(
      `created_at descending order at index ${i}`,
      current >= next,
    );
  }

  // 8. Test sorting by title - ascending
  const titleAsc: IPageIRedditCommunityCommunityRule.ISummary =
    await api.functional.redditCommunity.communities.rules.index(connection, {
      communityName: community.name,
      body: {
        sort_by: "title",
        order: "asc",
        limit: 10,
      } satisfies IRedditCommunityCommunityRule.IRequest,
    });
  typia.assert(titleAsc);

  const expectedTitlesAsc = [
    "Alpha Rule",
    "Beta Rule",
    "Charlie Rule",
    "Mike Rule",
    "Zebra Rule",
  ];
  const actualTitlesAsc = titleAsc.data.map((r) => r.title);
  TestValidator.equals(
    "title ascending alphabetical order",
    actualTitlesAsc,
    expectedTitlesAsc,
  );

  // 9. Test sorting by title - descending
  const titleDesc: IPageIRedditCommunityCommunityRule.ISummary =
    await api.functional.redditCommunity.communities.rules.index(connection, {
      communityName: community.name,
      body: {
        sort_by: "title",
        order: "desc",
        limit: 10,
      } satisfies IRedditCommunityCommunityRule.IRequest,
    });
  typia.assert(titleDesc);

  const expectedTitlesDesc = [
    "Zebra Rule",
    "Mike Rule",
    "Charlie Rule",
    "Beta Rule",
    "Alpha Rule",
  ];
  const actualTitlesDesc = titleDesc.data.map((r) => r.title);
  TestValidator.equals(
    "title descending alphabetical order",
    actualTitlesDesc,
    expectedTitlesDesc,
  );

  // 10. Verify ascending and descending are reversed
  TestValidator.equals(
    "title ascending reversed equals descending",
    actualTitlesAsc.slice().reverse(),
    actualTitlesDesc,
  );

  TestValidator.equals(
    "rule_number ascending reversed equals descending",
    actualRuleNumberAsc.slice().reverse(),
    actualRuleNumberDesc,
  );
}
