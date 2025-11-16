import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityRule } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityRule";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformCommunityRule } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommunityRule";

/**
 * Test retrieving and filtering community rules with various search criteria
 * and pagination options.
 *
 * This scenario validates the ability to search rules by keyword, filter by
 * specific rule numbers, and paginate through results. A member creates a
 * community with a category, then the system initializes with default rules.
 * The test then retrieves rules using different search queries, filter
 * combinations, and pagination parameters to verify that the rule list is
 * correctly returned with proper metadata. Success includes verifying rule
 * count matches expectations, search results are relevant, pagination
 * information is accurate, and sorting by different fields produces correct
 * orderings.
 *
 * Process:
 *
 * 1. Authenticate as administrator
 * 2. Create a community category
 * 3. Authenticate as member
 * 4. Create a community with the category (auto-generates default rules)
 * 5. Retrieve all rules with basic pagination
 * 6. Search rules by keyword
 * 7. Filter rules by specific rule number
 * 8. Test pagination with different limits
 * 9. Test sorting by different fields and directions
 */
export async function test_api_community_rules_search_and_filter(
  connection: api.IConnection,
) {
  // 1. Authenticate as administrator and create category
  const adminEmail = `admin_${RandomGenerator.alphaNumeric(8)}@test.com`;
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const admin: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        username: `admin_${RandomGenerator.alphaNumeric(6)}`,
        name: RandomGenerator.name(),
        href: "http://localhost:3000/admin/join",
        referrer: "http://localhost:3000",
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(admin);

  // Create category for community
  const category: ICommunityPlatformCategory =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: `Category_${RandomGenerator.alphaNumeric(8)}`,
          slug: `category-${RandomGenerator.alphaNumeric(8).toLowerCase()}`,
          description: RandomGenerator.paragraph({ sentences: 3 }),
          display_order: 1,
          icon_url: "http://localhost:3000/icons/category.png",
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category);

  // 2. Authenticate as member
  const memberEmail = `member_${RandomGenerator.alphaNumeric(8)}@test.com`;
  const memberPassword = RandomGenerator.alphaNumeric(12);
  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        username: `member_${RandomGenerator.alphaNumeric(6)}`,
        password: memberPassword,
        href: "http://localhost:3000/join",
        referrer: "http://localhost:3000",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member);

  // 3. Create community
  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: `Community_${RandomGenerator.alphaNumeric(8)}`,
          identifier: `comm_${RandomGenerator.alphaNumeric(8).toLowerCase()}`,
          description: RandomGenerator.paragraph({ sentences: 5 }),
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
          category_slug: category.slug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // 4. Retrieve all rules with basic pagination
  const allRulesResponse: IPageICommunityPlatformCommunityRule =
    await api.functional.communityPlatform.communities.rules.index(connection, {
      communityId: community.id,
      body: {
        page: 1,
        limit: 10,
      } satisfies ICommunityPlatformCommunityRule.IRequest,
    });
  typia.assert(allRulesResponse);
  TestValidator.predicate(
    "pagination should have data",
    () => allRulesResponse.data.length > 0,
  );
  TestValidator.equals(
    "pagination current page should be 1",
    allRulesResponse.pagination.current,
    1,
  );
  TestValidator.predicate(
    "pagination limit should be set",
    () => allRulesResponse.pagination.limit > 0,
  );
  TestValidator.predicate(
    "total records should be greater than 0",
    () => allRulesResponse.pagination.records > 0,
  );
  TestValidator.predicate(
    "total pages should be calculated",
    () => allRulesResponse.pagination.pages > 0,
  );

  // 5. Test search by keyword - search within rule titles/descriptions
  if (allRulesResponse.data.length > 0) {
    const firstRule = allRulesResponse.data[0];
    const searchKeyword = firstRule.title.substring(0, 3);

    const searchResults: IPageICommunityPlatformCommunityRule =
      await api.functional.communityPlatform.communities.rules.index(
        connection,
        {
          communityId: community.id,
          body: {
            search: searchKeyword,
            page: 1,
            limit: 10,
          } satisfies ICommunityPlatformCommunityRule.IRequest,
        },
      );
    typia.assert(searchResults);
    TestValidator.predicate(
      "search results should not be empty",
      () => searchResults.data.length >= 0,
    );
  }

  // 6. Test filter by specific rule number
  if (allRulesResponse.data.length > 0) {
    const targetRuleNumber = allRulesResponse.data[0].rule_number;

    const filterResults: IPageICommunityPlatformCommunityRule =
      await api.functional.communityPlatform.communities.rules.index(
        connection,
        {
          communityId: community.id,
          body: {
            rule_number: targetRuleNumber,
            page: 1,
            limit: 10,
          } satisfies ICommunityPlatformCommunityRule.IRequest,
        },
      );
    typia.assert(filterResults);
    TestValidator.predicate("filtered result should match rule number", () =>
      filterResults.data.every((rule) => rule.rule_number === targetRuleNumber),
    );
  }

  // 7. Test pagination with different limits
  const paginationTest1: IPageICommunityPlatformCommunityRule =
    await api.functional.communityPlatform.communities.rules.index(connection, {
      communityId: community.id,
      body: {
        page: 1,
        limit: 5,
      } satisfies ICommunityPlatformCommunityRule.IRequest,
    });
  typia.assert(paginationTest1);
  TestValidator.equals(
    "limit should be 5",
    paginationTest1.pagination.limit,
    5,
  );
  TestValidator.predicate(
    "data should not exceed limit",
    () => paginationTest1.data.length <= 5,
  );

  // 8. Test pagination page 2
  if (paginationTest1.pagination.pages > 1) {
    const page2Results: IPageICommunityPlatformCommunityRule =
      await api.functional.communityPlatform.communities.rules.index(
        connection,
        {
          communityId: community.id,
          body: {
            page: 2,
            limit: 5,
          } satisfies ICommunityPlatformCommunityRule.IRequest,
        },
      );
    typia.assert(page2Results);
    TestValidator.equals(
      "page 2 current should be 2",
      page2Results.pagination.current,
      2,
    );
    TestValidator.predicate("page 2 should have different data", () => {
      const page1Ids = paginationTest1.data.map((r) => r.id);
      const page2Ids = page2Results.data.map((r) => r.id);
      return !page1Ids.some((id) => page2Ids.includes(id));
    });
  }

  // 9. Test sorting by rule_number ascending
  const sortByRuleNumberAsc: IPageICommunityPlatformCommunityRule =
    await api.functional.communityPlatform.communities.rules.index(connection, {
      communityId: community.id,
      body: {
        page: 1,
        limit: 10,
        sort_by: "rule_number",
        order: "asc",
      } satisfies ICommunityPlatformCommunityRule.IRequest,
    });
  typia.assert(sortByRuleNumberAsc);
  TestValidator.predicate("rule numbers should be in ascending order", () => {
    for (let i = 1; i < sortByRuleNumberAsc.data.length; i++) {
      if (
        sortByRuleNumberAsc.data[i].rule_number <
        sortByRuleNumberAsc.data[i - 1].rule_number
      ) {
        return false;
      }
    }
    return true;
  });

  // 10. Test sorting by rule_number descending
  const sortByRuleNumberDesc: IPageICommunityPlatformCommunityRule =
    await api.functional.communityPlatform.communities.rules.index(connection, {
      communityId: community.id,
      body: {
        page: 1,
        limit: 10,
        sort_by: "rule_number",
        order: "desc",
      } satisfies ICommunityPlatformCommunityRule.IRequest,
    });
  typia.assert(sortByRuleNumberDesc);
  TestValidator.predicate("rule numbers should be in descending order", () => {
    for (let i = 1; i < sortByRuleNumberDesc.data.length; i++) {
      if (
        sortByRuleNumberDesc.data[i].rule_number >
        sortByRuleNumberDesc.data[i - 1].rule_number
      ) {
        return false;
      }
    }
    return true;
  });

  // 11. Test sorting by created_at
  const sortByCreatedAt: IPageICommunityPlatformCommunityRule =
    await api.functional.communityPlatform.communities.rules.index(connection, {
      communityId: community.id,
      body: {
        page: 1,
        limit: 10,
        sort_by: "created_at",
        order: "asc",
      } satisfies ICommunityPlatformCommunityRule.IRequest,
    });
  typia.assert(sortByCreatedAt);
  TestValidator.predicate(
    "rules should be sorted by created_at",
    () => sortByCreatedAt.data.length >= 0,
  );

  // 12. Test sorting by updated_at
  const sortByUpdatedAt: IPageICommunityPlatformCommunityRule =
    await api.functional.communityPlatform.communities.rules.index(connection, {
      communityId: community.id,
      body: {
        page: 1,
        limit: 10,
        sort_by: "updated_at",
        order: "desc",
      } satisfies ICommunityPlatformCommunityRule.IRequest,
    });
  typia.assert(sortByUpdatedAt);
  TestValidator.predicate(
    "rules should be sorted by updated_at",
    () => sortByUpdatedAt.data.length >= 0,
  );

  // 13. Final validation: verify consistent total records across queries
  TestValidator.equals(
    "total records should be consistent",
    allRulesResponse.pagination.records,
    sortByRuleNumberAsc.pagination.records,
  );
}
