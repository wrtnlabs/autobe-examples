import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformContentPolicyCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformContentPolicyCategory";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformContentPolicyCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformContentPolicyCategory";

/**
 * Validate that the includeDeleted flag on content policy category search
 * requests is accepted and that categories created by a platform admin are
 * discoverable regardless of the flag value.
 *
 * Business flow:
 *
 * 1. Register a platform admin via POST /auth/platformAdmin/join.
 * 2. As that admin, create multiple content policy categories via POST
 *    /communityPlatform/platformAdmin/contentPolicyCategories.
 * 3. Call PATCH /communityPlatform/platformAdmin/contentPolicyCategories three
 *    times with different includeDeleted configurations:
 *
 *    - Omitted (no includeDeleted field)
 *    - Explicitly false
 *    - Explicitly true
 * 4. For each search call, verify that:
 *
 *    - The response type matches
 *         IPageICommunityPlatformContentPolicyCategory.ISummary.
 *    - The created categories are present in the data array (matched by code).
 *    - Pagination metadata is logically consistent (non-negative counts, pages >= 1
 *         when records > 0, etc.).
 */
export async function test_api_content_policy_category_search_include_deleted(
  connection: api.IConnection,
) {
  // 1. Join as a platform admin to establish authentication context.
  const joinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    displayName: RandomGenerator.name(),
    href: "https://admin.community.local/join",
    referrer: "https://admin.community.local/landing",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const admin: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert(admin);

  // 2. Create multiple content policy categories.
  const categoriesToCreate: ICommunityPlatformContentPolicyCategory.ICreate[] =
    ArrayUtil.repeat(2, (index) => {
      const baseCode = RandomGenerator.alphabets(8);
      const code = `${baseCode}_${index}`;
      return {
        code,
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 1 }),
        isActive: true,
        isDefault: index === 0,
      } satisfies ICommunityPlatformContentPolicyCategory.ICreate;
    });

  const createdCategories: ICommunityPlatformContentPolicyCategory[] = [];
  for (const body of categoriesToCreate) {
    const created =
      await api.functional.communityPlatform.platformAdmin.contentPolicyCategories.create(
        connection,
        { body },
      );
    typia.assert(created);
    createdCategories.push(created);
  }

  TestValidator.equals(
    "created category count matches input array length",
    createdCategories.length,
    categoriesToCreate.length,
  );

  const createdCodes = createdCategories.map((c) => c.code);

  // Helper to validate that all created codes exist in response data.
  const assertContainsCreated = (
    title: string,
    page: IPageICommunityPlatformContentPolicyCategory.ISummary,
  ) => {
    const codesInPage = page.data.map((c) => c.code);
    for (const code of createdCodes) {
      TestValidator.predicate(
        `${title}: response should contain created category code ${code}`,
        codesInPage.includes(code),
      );
    }
  };

  const assertPaginationConsistency = (
    title: string,
    page: IPageICommunityPlatformContentPolicyCategory.ISummary,
  ) => {
    const pagination = page.pagination;
    TestValidator.predicate(
      `${title}: pagination.current must be >= 0`,
      pagination.current >= 0,
    );
    TestValidator.predicate(
      `${title}: pagination.limit must be >= 0`,
      pagination.limit >= 0,
    );
    TestValidator.predicate(
      `${title}: pagination.records must be >= 0`,
      pagination.records >= 0,
    );
    TestValidator.predicate(
      `${title}: pagination.pages must be >= 0`,
      pagination.pages >= 0,
    );
    if (pagination.records > 0) {
      TestValidator.predicate(
        `${title}: when there are records, pages must be >= 1`,
        pagination.pages >= 1,
      );
    }
  };

  // 3-A. Search without includeDeleted (omitted) to ensure the endpoint
  // returns the created categories.
  const searchWithoutIncludeDeletedBody = {
    search: undefined,
    is_active: undefined,
    is_default: undefined,
    includeDeleted: undefined,
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 50 as number & tags.Type<"int32"> & tags.Minimum<1>,
    sortBy: undefined,
    sortDirection: undefined,
  } satisfies ICommunityPlatformContentPolicyCategory.IRequest;

  const pageWithoutIncludeDeleted: IPageICommunityPlatformContentPolicyCategory.ISummary =
    await api.functional.communityPlatform.platformAdmin.contentPolicyCategories.index(
      connection,
      { body: searchWithoutIncludeDeletedBody },
    );
  typia.assert(pageWithoutIncludeDeleted);
  assertContainsCreated(
    "search without includeDeleted",
    pageWithoutIncludeDeleted,
  );
  assertPaginationConsistency(
    "search without includeDeleted",
    pageWithoutIncludeDeleted,
  );

  // 3-B. Search with includeDeleted explicitly set to false.
  const searchWithIncludeDeletedFalseBody = {
    search: undefined,
    is_active: undefined,
    is_default: undefined,
    includeDeleted: false,
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 50 as number & tags.Type<"int32"> & tags.Minimum<1>,
    sortBy: undefined,
    sortDirection: undefined,
  } satisfies ICommunityPlatformContentPolicyCategory.IRequest;

  const pageWithIncludeDeletedFalse: IPageICommunityPlatformContentPolicyCategory.ISummary =
    await api.functional.communityPlatform.platformAdmin.contentPolicyCategories.index(
      connection,
      { body: searchWithIncludeDeletedFalseBody },
    );
  typia.assert(pageWithIncludeDeletedFalse);
  assertContainsCreated(
    "search with includeDeleted=false",
    pageWithIncludeDeletedFalse,
  );
  assertPaginationConsistency(
    "search with includeDeleted=false",
    pageWithIncludeDeletedFalse,
  );

  // 3-C. Search with includeDeleted explicitly set to true.
  const searchWithIncludeDeletedTrueBody = {
    search: undefined,
    is_active: undefined,
    is_default: undefined,
    includeDeleted: true,
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 50 as number & tags.Type<"int32"> & tags.Minimum<1>,
    sortBy: undefined,
    sortDirection: undefined,
  } satisfies ICommunityPlatformContentPolicyCategory.IRequest;

  const pageWithIncludeDeletedTrue: IPageICommunityPlatformContentPolicyCategory.ISummary =
    await api.functional.communityPlatform.platformAdmin.contentPolicyCategories.index(
      connection,
      { body: searchWithIncludeDeletedTrueBody },
    );
  typia.assert(pageWithIncludeDeletedTrue);
  assertContainsCreated(
    "search with includeDeleted=true",
    pageWithIncludeDeletedTrue,
  );
  assertPaginationConsistency(
    "search with includeDeleted=true",
    pageWithIncludeDeletedTrue,
  );
}
