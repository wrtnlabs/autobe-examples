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

export async function test_api_community_rule_category_search_with_results(
  connection: api.IConnection,
) {
  // 1. Join as a new platform administrator to obtain an authorized admin session
  const adminJoinBody = {
    username: `admin_${RandomGenerator.alphaNumeric(8)}`,
    email: `${RandomGenerator.alphaNumeric(8)}@example.com`,
    password: RandomGenerator.alphaNumeric(12),
    displayName: RandomGenerator.name(),
    href: "https://admin.example.com/register",
    referrer: "https://admin.example.com/landing",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const adminAuthorized: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Create a new active community rule category as this platform admin
  const categoryCodePrefix = RandomGenerator.alphaNumeric(6);
  const categoryName = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 3,
    wordMax: 10,
  });
  const categoryDescription = RandomGenerator.paragraph({
    sentences: 6,
    wordMin: 3,
    wordMax: 10,
  });

  const createCategoryBody = {
    code: `e2e_${categoryCodePrefix}`,
    name: categoryName,
    description: categoryDescription,
    sort_order: 10,
    is_active: true,
  } satisfies ICommunityPlatformCommunityRuleCategory.ICreate;

  const createdCategory: ICommunityPlatformCommunityRuleCategory =
    await api.functional.communityPlatform.platformAdmin.communityRuleCategories.create(
      connection,
      {
        body: createCategoryBody,
      },
    );
  typia.assert(createdCategory);

  // 3. Build a search request using a substring of the created category name
  const searchSubstring = RandomGenerator.substring(categoryName);

  const requestPage = 1;
  const requestPageSize = 10;

  const searchRequestBody = {
    page: requestPage,
    pageSize: requestPageSize,
    search: searchSubstring,
    is_active: true,
  } satisfies ICommunityPlatformCommunityRuleCategory.IRequest;

  const pageResult: IPageICommunityPlatformCommunityRuleCategory.ISummary =
    await api.functional.communityPlatform.communityRuleCategories.index(
      connection,
      {
        body: searchRequestBody,
      },
    );
  typia.assert(pageResult);

  const { pagination, data } = pageResult;

  // 4. Validate pagination metadata
  TestValidator.equals(
    "pagination.current should be 1",
    pagination.current,
    requestPage,
  );
  TestValidator.equals(
    "pagination.limit should equal requested pageSize",
    pagination.limit,
    requestPageSize,
  );
  TestValidator.predicate(
    "pagination.records should be >= 1",
    pagination.records >= 1,
  );
  TestValidator.predicate(
    "pagination.pages should be >= 1",
    pagination.pages >= 1,
  );
  TestValidator.predicate("data length should be >= 1", data.length >= 1);

  // 5. Locate the created category in the returned data
  const matchedCategory = data.find(
    (summary) => summary.code === createdCategory.code,
  );

  TestValidator.predicate(
    "created category should be present in search results",
    matchedCategory !== undefined,
  );

  if (!matchedCategory) return;

  // 6. Validate matched category fields
  TestValidator.equals(
    "matched category code should equal created code",
    matchedCategory.code,
    createdCategory.code,
  );
  TestValidator.equals(
    "matched category name should equal created name",
    matchedCategory.name,
    createdCategory.name,
  );
  TestValidator.equals(
    "matched category description should equal created description",
    matchedCategory.description,
    createdCategory.description,
  );
  TestValidator.equals(
    "matched category is_active should be true",
    matchedCategory.is_active,
    true,
  );

  // created_at and updated_at existence/format are already fully validated by typia.assert,
  // but we ensure they are non-empty strings for business readability
  TestValidator.predicate(
    "matched category created_at should be non-empty",
    matchedCategory.created_at.length > 0,
  );
  TestValidator.predicate(
    "matched category updated_at should be non-empty",
    matchedCategory.updated_at.length > 0,
  );
}
