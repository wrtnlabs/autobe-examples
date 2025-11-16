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
 * Test retrieving community rules with pagination functionality.
 *
 * This test validates the pagination behavior of the community rules retrieval
 * endpoint. It creates a moderator account, establishes a community, adds
 * multiple rules (at least 5), and then retrieves the rules using various
 * pagination parameters.
 *
 * Steps:
 *
 * 1. Create and authenticate a moderator account
 * 2. Create a community for testing
 * 3. Add multiple community rules (at least 5)
 * 4. Test pagination with different page sizes and page numbers
 * 5. Validate pagination metadata (current page, total pages, total records,
 *    limit)
 * 6. Verify rules are ordered by rule_number
 * 7. Test edge cases (page beyond available, min/max limit values)
 * 8. Verify ISummary fields are present in returned data
 */
export async function test_api_community_rules_retrieval_with_pagination(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate a moderator account
  const moderator: IRedditCommunityCommunityModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "SecurePassword123!",
        nickname: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IRedditCommunityCommunityModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 2: Create a community
  const communityName = RandomGenerator.alphabets(10);
  const community: IRedditCommunityCommunity =
    await api.functional.redditCommunity.moderator.communities.create(
      connection,
      {
        body: {
          name: communityName,
          display_title: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.paragraph({ sentences: 5 }),
          rules: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IRedditCommunityCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Step 3: Add multiple community rules (at least 5 for testing pagination)
  const ruleCount = 7;
  const createdRules: IRedditCommunityCommunityRule[] = [];

  for (let i = 1; i <= ruleCount; i++) {
    const rule: IRedditCommunityCommunityRule =
      await api.functional.redditCommunity.moderator.communities.rules.create(
        connection,
        {
          communityName: community.name,
          body: {
            title: `Rule ${i}: ${RandomGenerator.paragraph({ sentences: 1 })}`,
            description: RandomGenerator.paragraph({ sentences: 3 }),
            rule_number: i,
          } satisfies IRedditCommunityCommunityRule.ICreate,
        },
      );
    typia.assert(rule);
    createdRules.push(rule);
  }

  // Step 4: Test basic pagination - retrieve all rules with default settings
  const allRulesPage: IPageIRedditCommunityCommunityRule.ISummary =
    await api.functional.redditCommunity.communities.rules.index(connection, {
      communityName: community.name,
      body: {} satisfies IRedditCommunityCommunityRule.IRequest,
    });
  typia.assert(allRulesPage);

  // Step 5: Validate pagination metadata for full result set
  TestValidator.equals(
    "total records should match created rules",
    allRulesPage.pagination.records,
    ruleCount,
  );
  TestValidator.predicate(
    "data array should contain all rules",
    allRulesPage.data.length === ruleCount,
  );

  // Step 6: Verify rules are ordered by rule_number
  for (let i = 0; i < allRulesPage.data.length - 1; i++) {
    TestValidator.predicate(
      "rules should be ordered by rule_number",
      allRulesPage.data[i].rule_number <= allRulesPage.data[i + 1].rule_number,
    );
  }

  // Step 7: Test pagination with specific page size (limit = 3)
  const limit = 3;
  const firstPage: IPageIRedditCommunityCommunityRule.ISummary =
    await api.functional.redditCommunity.communities.rules.index(connection, {
      communityName: community.name,
      body: {
        page: 1,
        limit: limit,
      } satisfies IRedditCommunityCommunityRule.IRequest,
    });
  typia.assert(firstPage);

  // Validate first page metadata
  TestValidator.equals(
    "first page current should be 0",
    firstPage.pagination.current,
    0,
  );
  TestValidator.equals(
    "first page limit should match request",
    firstPage.pagination.limit,
    limit,
  );
  TestValidator.equals(
    "first page records should match total",
    firstPage.pagination.records,
    ruleCount,
  );
  const expectedPages = Math.ceil(ruleCount / limit);
  TestValidator.equals(
    "first page total pages should be correct",
    firstPage.pagination.pages,
    expectedPages,
  );
  TestValidator.predicate(
    "first page data length should match limit",
    firstPage.data.length === limit,
  );

  // Step 8: Test second page
  const secondPage: IPageIRedditCommunityCommunityRule.ISummary =
    await api.functional.redditCommunity.communities.rules.index(connection, {
      communityName: community.name,
      body: {
        page: 2,
        limit: limit,
      } satisfies IRedditCommunityCommunityRule.IRequest,
    });
  typia.assert(secondPage);

  // Validate second page metadata
  TestValidator.equals(
    "second page current should be 1",
    secondPage.pagination.current,
    1,
  );
  TestValidator.equals(
    "second page limit should match request",
    secondPage.pagination.limit,
    limit,
  );
  TestValidator.predicate(
    "second page data length should match limit",
    secondPage.data.length === limit,
  );

  // Step 9: Test last page
  const lastPage: IPageIRedditCommunityCommunityRule.ISummary =
    await api.functional.redditCommunity.communities.rules.index(connection, {
      communityName: community.name,
      body: {
        page: expectedPages,
        limit: limit,
      } satisfies IRedditCommunityCommunityRule.IRequest,
    });
  typia.assert(lastPage);

  const expectedLastPageItems = ruleCount - limit * (expectedPages - 1);
  TestValidator.equals(
    "last page current should match",
    lastPage.pagination.current,
    expectedPages - 1,
  );
  TestValidator.predicate(
    "last page should have remaining items",
    lastPage.data.length === expectedLastPageItems,
  );

  // Step 10: Test page beyond available (should return empty data)
  const beyondPage: IPageIRedditCommunityCommunityRule.ISummary =
    await api.functional.redditCommunity.communities.rules.index(connection, {
      communityName: community.name,
      body: {
        page: 100,
        limit: limit,
      } satisfies IRedditCommunityCommunityRule.IRequest,
    });
  typia.assert(beyondPage);
  TestValidator.predicate(
    "beyond page should have empty data array",
    beyondPage.data.length === 0,
  );

  // Step 11: Test minimum limit value (1)
  const minLimitPage: IPageIRedditCommunityCommunityRule.ISummary =
    await api.functional.redditCommunity.communities.rules.index(connection, {
      communityName: community.name,
      body: {
        page: 1,
        limit: 1,
      } satisfies IRedditCommunityCommunityRule.IRequest,
    });
  typia.assert(minLimitPage);
  TestValidator.equals(
    "min limit page should have 1 item",
    minLimitPage.data.length,
    1,
  );
  TestValidator.equals(
    "min limit should be 1",
    minLimitPage.pagination.limit,
    1,
  );

  // Step 12: Test maximum limit value (100)
  const maxLimitPage: IPageIRedditCommunityCommunityRule.ISummary =
    await api.functional.redditCommunity.communities.rules.index(connection, {
      communityName: community.name,
      body: {
        page: 1,
        limit: 100,
      } satisfies IRedditCommunityCommunityRule.IRequest,
    });
  typia.assert(maxLimitPage);
  TestValidator.equals(
    "max limit page should have all items",
    maxLimitPage.data.length,
    ruleCount,
  );
  TestValidator.equals(
    "max limit should be 100",
    maxLimitPage.pagination.limit,
    100,
  );

  // Step 13: Verify ISummary fields are present and properly typed
  const sampleRule = firstPage.data[0];
  typia.assert(sampleRule);

  // Step 14: Verify rule_number ordering across pages
  const allDataFromPages: IRedditCommunityCommunityRule.ISummary[] = [];
  for (let page = 1; page <= expectedPages; page++) {
    const pageData: IPageIRedditCommunityCommunityRule.ISummary =
      await api.functional.redditCommunity.communities.rules.index(connection, {
        communityName: community.name,
        body: {
          page: page,
          limit: limit,
        } satisfies IRedditCommunityCommunityRule.IRequest,
      });
    typia.assert(pageData);
    allDataFromPages.push(...pageData.data);
  }

  // Verify complete ordering across all pages
  for (let i = 0; i < allDataFromPages.length - 1; i++) {
    TestValidator.predicate(
      "rules across pages should maintain ordering",
      allDataFromPages[i].rule_number <= allDataFromPages[i + 1].rule_number,
    );
  }

  // Final validation: ensure all created rules are retrievable
  TestValidator.equals(
    "all rules should be retrievable",
    allDataFromPages.length,
    ruleCount,
  );
}
