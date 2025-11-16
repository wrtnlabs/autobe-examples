import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformCommunityRuleCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityRuleCategory";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformCommunityRuleCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommunityRuleCategory";

export async function test_api_community_rule_category_search_by_active_flag(
  connection: api.IConnection,
) {
  // 1. Register a platform administrator to gain platformAdmin privileges
  const adminJoinBody = {
    username: `admin_${RandomGenerator.alphaNumeric(8)}`,
    email: `${RandomGenerator.alphaNumeric(8)}@example.com`,
    password: RandomGenerator.alphaNumeric(12),
    displayName: RandomGenerator.name(),
    ip: undefined,
    href: "https://admin.example.com/register",
    referrer: "https://admin.example.com/landing",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const admin: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(admin);

  // 2. Create two community rule categories with different is_active flags
  const sharedNamePrefix = `ActiveFlag Test ${RandomGenerator.alphabets(6)}`;

  const activeCategoryBody = {
    code: `active_${RandomGenerator.alphaNumeric(10)}`,
    name: `${sharedNamePrefix} - Active`,
    description: RandomGenerator.paragraph({ sentences: 5 }),
    sort_order: 1,
    is_active: true,
  } satisfies ICommunityPlatformCommunityRuleCategory.ICreate;

  const inactiveCategoryBody = {
    code: `inactive_${RandomGenerator.alphaNumeric(10)}`,
    name: `${sharedNamePrefix} - Inactive`,
    description: RandomGenerator.paragraph({ sentences: 5 }),
    sort_order: 2,
    is_active: false,
  } satisfies ICommunityPlatformCommunityRuleCategory.ICreate;

  const activeCategory: ICommunityPlatformCommunityRuleCategory =
    await api.functional.communityPlatform.platformAdmin.communityRuleCategories.create(
      connection,
      {
        body: activeCategoryBody,
      },
    );
  typia.assert(activeCategory);

  const inactiveCategory: ICommunityPlatformCommunityRuleCategory =
    await api.functional.communityPlatform.platformAdmin.communityRuleCategories.create(
      connection,
      {
        body: inactiveCategoryBody,
      },
    );
  typia.assert(inactiveCategory);

  // Helper to validate pagination consistency relative to limit
  const assertBasicPaginationConsistency = (
    title: string,
    pagination: IPage.IPagination,
  ): void => {
    // records, pages, current, limit are already asserted by typia
    if (pagination.records === 0) {
      TestValidator.equals(
        `${title} - pages zero when no records`,
        pagination.pages,
        0,
      );
      return;
    }

    TestValidator.predicate(
      `${title} - pages at least 1 when records > 0`,
      pagination.pages >= 1,
    );

    if (pagination.records <= pagination.limit && pagination.limit > 0) {
      TestValidator.equals(
        `${title} - single page when records <= limit`,
        pagination.pages,
        1,
      );
    }
  };

  const pageSize = 10;

  // 3. Search with is_active = true, no explicit search term
  const activeSearchBody = {
    page: 1,
    pageSize,
    search: sharedNamePrefix,
    is_active: true,
    orderBy: undefined,
    orderDirection: undefined,
  } satisfies ICommunityPlatformCommunityRuleCategory.IRequest;

  const activeSearchResult: IPageICommunityPlatformCommunityRuleCategory.ISummary =
    await api.functional.communityPlatform.communityRuleCategories.index(
      connection,
      { body: activeSearchBody },
    );
  typia.assert(activeSearchResult);

  const activePagination = activeSearchResult.pagination;
  assertBasicPaginationConsistency("active search", activePagination);

  // All returned categories must be active
  const activeData = activeSearchResult.data;
  TestValidator.predicate(
    "active search - all results have is_active = true",
    activeData.every((c) => c.is_active === true),
  );

  // Ensure our known active category is present when page includes it
  const activeFound = activeData.some((c) => c.id === activeCategory.id);
  TestValidator.predicate(
    "active search - known active category should appear on first page when matching prefix",
    activeFound || activePagination.records > activeData.length,
  );

  // Ensure inactive category is not present in the active-only results
  const inactiveInActive = activeData.some((c) => c.id === inactiveCategory.id);
  TestValidator.predicate(
    "active search - inactive category must not appear",
    inactiveInActive === false,
  );

  // 4. Search with is_active = false
  const inactiveSearchBody = {
    page: 1,
    pageSize,
    search: sharedNamePrefix,
    is_active: false,
    orderBy: undefined,
    orderDirection: undefined,
  } satisfies ICommunityPlatformCommunityRuleCategory.IRequest;

  const inactiveSearchResult: IPageICommunityPlatformCommunityRuleCategory.ISummary =
    await api.functional.communityPlatform.communityRuleCategories.index(
      connection,
      { body: inactiveSearchBody },
    );
  typia.assert(inactiveSearchResult);

  const inactivePagination = inactiveSearchResult.pagination;
  assertBasicPaginationConsistency("inactive search", inactivePagination);

  const inactiveData = inactiveSearchResult.data;
  TestValidator.predicate(
    "inactive search - all results have is_active = false",
    inactiveData.every((c) => c.is_active === false),
  );

  const inactiveFound = inactiveData.some((c) => c.id === inactiveCategory.id);
  TestValidator.predicate(
    "inactive search - known inactive category should appear on first page when matching prefix",
    inactiveFound || inactivePagination.records > inactiveData.length,
  );

  const activeInInactive = inactiveData.some((c) => c.id === activeCategory.id);
  TestValidator.predicate(
    "inactive search - active category must not appear",
    activeInInactive === false,
  );
}
