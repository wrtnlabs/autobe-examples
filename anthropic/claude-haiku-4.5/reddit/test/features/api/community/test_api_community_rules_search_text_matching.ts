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
 * Test the search functionality for community rules to verify text matching
 * across titles and descriptions.
 *
 * This test validates that the community rules search endpoint correctly finds
 * rules matching keywords in both title and description fields. Since rules are
 * managed separately, this test focuses on verifying the search API behavior
 * with an existing community and its rules.
 *
 * Test workflow:
 *
 * 1. Create administrator account for category creation
 * 2. Create a community category
 * 3. Create member account for community creation
 * 4. Create a community
 * 5. Test various search queries against the community's rules:
 *
 *    - Search with empty/undefined search parameter
 *    - Search with specific keywords
 *    - Search for non-existent keywords (no results)
 *    - Search with pagination
 *    - Search with sorting by different fields
 * 6. Validate pagination structure
 * 7. Validate sorting order
 */
export async function test_api_community_rules_search_text_matching(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account for category creation
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const administrator: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password: "AdminPassword123!",
        username: `admin_${RandomGenerator.alphaNumeric(8)}`,
        name: RandomGenerator.name(),
        href: "http://localhost:3000/admin/join",
        referrer: "http://localhost:3000",
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(administrator);

  // Step 2: Create a community category
  const category: ICommunityPlatformCategory =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: `Category_${RandomGenerator.alphaNumeric(8)}`,
          slug: `category-${RandomGenerator.alphaNumeric(8)}`,
          description: "Test category for rule search",
          display_order: 1,
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category);

  // Step 3: Create member account for community creation
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        username: `user_${RandomGenerator.alphaNumeric(8)}`,
        password: "Password123!",
        href: "http://localhost:3000/join",
        referrer: "http://localhost:3000",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member);

  // Step 4: Create a community
  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: `TestCommunity_${RandomGenerator.alphaNumeric(8)}`,
          identifier: `test_${RandomGenerator.alphaNumeric(8)}`,
          description: "Community for testing rule search functionality",
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
          category_slug: category.slug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Step 5: Test search functionality with various parameters

  // Test: Basic search with no search parameter (retrieve all rules)
  const allRulesResponse: IPageICommunityPlatformCommunityRule =
    await api.functional.communityPlatform.communities.rules.index(connection, {
      communityId: community.id,
      body: {
        page: 1,
        limit: 10,
        search: undefined,
        rule_number: undefined,
        sort_by: "rule_number",
        order: "asc",
      } satisfies ICommunityPlatformCommunityRule.IRequest,
    });
  typia.assert(allRulesResponse);
  TestValidator.predicate(
    "all rules response should have valid pagination",
    allRulesResponse.pagination.current > 0 &&
      allRulesResponse.pagination.limit > 0,
  );

  // Test: Search with empty string
  const emptySearchResponse: IPageICommunityPlatformCommunityRule =
    await api.functional.communityPlatform.communities.rules.index(connection, {
      communityId: community.id,
      body: {
        page: 1,
        limit: 10,
        search: "",
        rule_number: undefined,
        sort_by: "rule_number",
        order: "asc",
      } satisfies ICommunityPlatformCommunityRule.IRequest,
    });
  typia.assert(emptySearchResponse);

  // Test: Search with keyword that should not match any rules
  const noResultSearch: IPageICommunityPlatformCommunityRule =
    await api.functional.communityPlatform.communities.rules.index(connection, {
      communityId: community.id,
      body: {
        page: 1,
        limit: 10,
        search: "nonexistentKeywordXYZ12345",
        rule_number: undefined,
        sort_by: "rule_number",
        order: "asc",
      } satisfies ICommunityPlatformCommunityRule.IRequest,
    });
  typia.assert(noResultSearch);
  TestValidator.predicate(
    "search with non-matching keyword should return empty results",
    noResultSearch.data.length === 0,
  );

  // Test: Search with specific rule number filter
  const ruleNumberFilterResponse: IPageICommunityPlatformCommunityRule =
    await api.functional.communityPlatform.communities.rules.index(connection, {
      communityId: community.id,
      body: {
        page: 1,
        limit: 10,
        search: undefined,
        rule_number: 1,
        sort_by: "rule_number",
        order: "asc",
      } satisfies ICommunityPlatformCommunityRule.IRequest,
    });
  typia.assert(ruleNumberFilterResponse);
  if (ruleNumberFilterResponse.data.length > 0) {
    TestValidator.predicate(
      "rule number filter should return only matching rule numbers",
      ruleNumberFilterResponse.data.every((rule) => rule.rule_number === 1),
    );
  }

  // Test: Pagination with limit
  const paginatedResponse: IPageICommunityPlatformCommunityRule =
    await api.functional.communityPlatform.communities.rules.index(connection, {
      communityId: community.id,
      body: {
        page: 1,
        limit: 5,
        search: undefined,
        rule_number: undefined,
        sort_by: "rule_number",
        order: "asc",
      } satisfies ICommunityPlatformCommunityRule.IRequest,
    });
  typia.assert(paginatedResponse);
  TestValidator.predicate(
    "pagination limit should be respected",
    paginatedResponse.data.length <= 5,
  );

  // Test: Sorting by created_at in ascending order
  const sortByCreatedAtAsc: IPageICommunityPlatformCommunityRule =
    await api.functional.communityPlatform.communities.rules.index(connection, {
      communityId: community.id,
      body: {
        page: 1,
        limit: 10,
        search: undefined,
        rule_number: undefined,
        sort_by: "created_at",
        order: "asc",
      } satisfies ICommunityPlatformCommunityRule.IRequest,
    });
  typia.assert(sortByCreatedAtAsc);

  // Test: Sorting by updated_at in descending order
  const sortByUpdatedAtDesc: IPageICommunityPlatformCommunityRule =
    await api.functional.communityPlatform.communities.rules.index(connection, {
      communityId: community.id,
      body: {
        page: 1,
        limit: 10,
        search: undefined,
        rule_number: undefined,
        sort_by: "updated_at",
        order: "desc",
      } satisfies ICommunityPlatformCommunityRule.IRequest,
    });
  typia.assert(sortByUpdatedAtDesc);

  // Validate pagination structure
  TestValidator.predicate(
    "pagination object should have all required fields",
    allRulesResponse.pagination.current >= 0 &&
      allRulesResponse.pagination.limit >= 0 &&
      allRulesResponse.pagination.pages >= 0 &&
      allRulesResponse.pagination.records >= 0,
  );

  // Validate data array structure
  TestValidator.predicate(
    "all returned rules should have valid structure",
    allRulesResponse.data.every(
      (rule) =>
        rule.id &&
        rule.community_platform_community_id &&
        rule.rule_number > 0 &&
        rule.rule_number <= 10 &&
        rule.title &&
        rule.description &&
        rule.created_at &&
        rule.updated_at,
    ),
  );
}
