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

export async function test_api_community_rules_pagination_boundaries(
  connection: api.IConnection,
) {
  // Setup: Create administrator account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin = await api.functional.auth.administrator.join(connection, {
    body: {
      email: adminEmail,
      password: "AdminPassword123!",
      username: RandomGenerator.alphaNumeric(8),
      name: RandomGenerator.name(),
      href: "https://example.com/admin",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformAdministrator.ICreate,
  });
  typia.assert(admin);

  // Setup: Create member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: "MemberPassword123!",
      username: RandomGenerator.alphaNumeric(8),
      href: "https://example.com/member",
      referrer: "https://example.com",
      ip: "127.0.0.1",
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(member);

  // Setup: Create category
  const category =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(2),
          slug: RandomGenerator.alphaNumeric(8).toLowerCase(),
          description: RandomGenerator.paragraph(),
          display_order: 1,
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category);

  // Setup: Create community
  const community =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(3),
          identifier: RandomGenerator.alphaNumeric(8).toLowerCase(),
          description: RandomGenerator.paragraph(),
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
          category_slug: category.slug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Test Case 1: First page with limit=1
  const firstPageLimit1 =
    await api.functional.communityPlatform.communities.rules.index(connection, {
      communityId: community.id,
      body: {
        page: 1,
        limit: 1,
      } satisfies ICommunityPlatformCommunityRule.IRequest,
    });
  typia.assert(firstPageLimit1);
  TestValidator.predicate(
    "first page limit 1 should have pagination",
    firstPageLimit1.pagination !== null,
  );
  TestValidator.equals(
    "first page should be 1",
    firstPageLimit1.pagination.current,
    1,
  );
  TestValidator.equals(
    "limit should be 1",
    firstPageLimit1.pagination.limit,
    1,
  );

  // Test Case 2: First page with limit=10
  const firstPageLimit10 =
    await api.functional.communityPlatform.communities.rules.index(connection, {
      communityId: community.id,
      body: {
        page: 1,
        limit: 10,
      } satisfies ICommunityPlatformCommunityRule.IRequest,
    });
  typia.assert(firstPageLimit10);
  TestValidator.predicate(
    "first page limit 10 should have pagination",
    firstPageLimit10.pagination !== null,
  );
  TestValidator.equals(
    "current page should be 1",
    firstPageLimit10.pagination.current,
    1,
  );
  TestValidator.equals(
    "limit should be 10",
    firstPageLimit10.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "data array should not exceed limit",
    firstPageLimit10.data.length <= 10,
  );

  // Test Case 3: First page with maximum limit=100
  const firstPageLimit100 =
    await api.functional.communityPlatform.communities.rules.index(connection, {
      communityId: community.id,
      body: {
        page: 1,
        limit: 100,
      } satisfies ICommunityPlatformCommunityRule.IRequest,
    });
  typia.assert(firstPageLimit100);
  TestValidator.predicate(
    "first page limit 100 should have pagination",
    firstPageLimit100.pagination !== null,
  );
  TestValidator.equals(
    "current page should be 1",
    firstPageLimit100.pagination.current,
    1,
  );
  TestValidator.equals(
    "limit should be 100",
    firstPageLimit100.pagination.limit,
    100,
  );
  TestValidator.predicate(
    "data array should not exceed limit",
    firstPageLimit100.data.length <= 100,
  );

  // Test Case 4: Empty result set with search filter
  const emptySearchResult =
    await api.functional.communityPlatform.communities.rules.index(connection, {
      communityId: community.id,
      body: {
        page: 1,
        limit: 10,
        search: "nonexistent_rule_that_does_not_exist",
      } satisfies ICommunityPlatformCommunityRule.IRequest,
    });
  typia.assert(emptySearchResult);
  TestValidator.predicate(
    "empty result should have pagination",
    emptySearchResult.pagination !== null,
  );
  TestValidator.equals(
    "empty result records should be 0",
    emptySearchResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "empty result pages should be 0",
    emptySearchResult.pagination.pages,
    0,
  );
  TestValidator.equals(
    "empty result data should be empty array",
    emptySearchResult.data.length,
    0,
  );

  // Test Case 5: Pagination metadata accuracy
  const metadataCheck =
    await api.functional.communityPlatform.communities.rules.index(connection, {
      communityId: community.id,
      body: {
        page: 1,
        limit: 10,
      } satisfies ICommunityPlatformCommunityRule.IRequest,
    });
  typia.assert(metadataCheck);
  TestValidator.predicate(
    "pagination current should be at least 1",
    metadataCheck.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit should be positive",
    metadataCheck.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records should be non-negative",
    metadataCheck.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages should be non-negative",
    metadataCheck.pagination.pages >= 0,
  );

  // Test Case 6: Pages calculation consistency
  const consistencyCheck =
    await api.functional.communityPlatform.communities.rules.index(connection, {
      communityId: community.id,
      body: {
        page: 1,
        limit: 10,
      } satisfies ICommunityPlatformCommunityRule.IRequest,
    });
  typia.assert(consistencyCheck);
  const expectedPages =
    consistencyCheck.pagination.records === 0
      ? 0
      : Math.ceil(
          consistencyCheck.pagination.records /
            consistencyCheck.pagination.limit,
        );
  TestValidator.equals(
    "pages should match calculated value",
    consistencyCheck.pagination.pages,
    expectedPages,
  );

  // Test Case 7: Invalid page number beyond last page
  const invalidPageResult =
    await api.functional.communityPlatform.communities.rules.index(connection, {
      communityId: community.id,
      body: {
        page: 999,
        limit: 10,
      } satisfies ICommunityPlatformCommunityRule.IRequest,
    });
  typia.assert(invalidPageResult);
  TestValidator.predicate(
    "invalid page should return empty or valid pagination",
    invalidPageResult.pagination !== null,
  );
  TestValidator.predicate(
    "data should be empty for invalid page",
    invalidPageResult.data.length === 0,
  );

  // Test Case 8: Sorting and ordering
  const sortedResult =
    await api.functional.communityPlatform.communities.rules.index(connection, {
      communityId: community.id,
      body: {
        page: 1,
        limit: 10,
        sort_by: "rule_number",
        order: "asc",
      } satisfies ICommunityPlatformCommunityRule.IRequest,
    });
  typia.assert(sortedResult);
  TestValidator.predicate(
    "sorted result should have valid pagination",
    sortedResult.pagination !== null,
  );
}
