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
 * Validate that the content policy category search endpoint correctly filters
 * by the `is_default` flag (and in combination with `is_active`).
 *
 * Business flow:
 *
 * 1. Register a platform admin via POST /auth/platformAdmin/join.
 * 2. As that admin, create several content policy categories:
 *
 *    - One default & active.
 *    - One non-default & active.
 *    - One default & inactive (to test combined filters with is_active).
 * 3. Call PATCH /communityPlatform/platformAdmin/contentPolicyCategories with
 *    `is_default = true` and verify only default categories are returned and
 *    the known non-default category is excluded.
 * 4. Call the same endpoint with `is_default = false` and verify only non-default
 *    categories are returned and default categories are excluded.
 * 5. Call the endpoint with both `is_default = true` and `is_active = true` and
 *    verify that inactive default categories are filtered out.
 */
export async function test_api_content_policy_category_search_by_default_flag(
  connection: api.IConnection,
) {
  // 1. Register a platform admin and establish authenticated context.
  const joinBody = {
    username: `admin_${RandomGenerator.alphaNumeric(8)}`,
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    displayName: RandomGenerator.name(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const admin: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert<ICommunityPlatformPlatformadmin.IAuthorized>(admin);

  // 2. Create categories with different isDefault / isActive combinations.
  const defaultActiveCode = `default_active_${RandomGenerator.alphaNumeric(6)}`;
  const nonDefaultActiveCode = `non_default_active_${RandomGenerator.alphaNumeric(6)}`;
  const defaultInactiveCode = `default_inactive_${RandomGenerator.alphaNumeric(6)}`;

  const defaultActiveCategory: ICommunityPlatformContentPolicyCategory =
    await api.functional.communityPlatform.platformAdmin.contentPolicyCategories.create(
      connection,
      {
        body: {
          code: defaultActiveCode,
          name: `Default Active ${RandomGenerator.name(1)}`,
          description: RandomGenerator.paragraph({
            sentences: 5,
            wordMin: 3,
            wordMax: 8,
          }),
          isActive: true,
          isDefault: true,
        } satisfies ICommunityPlatformContentPolicyCategory.ICreate,
      },
    );
  typia.assert<ICommunityPlatformContentPolicyCategory>(defaultActiveCategory);

  const nonDefaultActiveCategory: ICommunityPlatformContentPolicyCategory =
    await api.functional.communityPlatform.platformAdmin.contentPolicyCategories.create(
      connection,
      {
        body: {
          code: nonDefaultActiveCode,
          name: `Non-Default Active ${RandomGenerator.name(1)}`,
          description: RandomGenerator.paragraph({
            sentences: 5,
            wordMin: 3,
            wordMax: 8,
          }),
          isActive: true,
          isDefault: false,
        } satisfies ICommunityPlatformContentPolicyCategory.ICreate,
      },
    );
  typia.assert<ICommunityPlatformContentPolicyCategory>(
    nonDefaultActiveCategory,
  );

  const defaultInactiveCategory: ICommunityPlatformContentPolicyCategory =
    await api.functional.communityPlatform.platformAdmin.contentPolicyCategories.create(
      connection,
      {
        body: {
          code: defaultInactiveCode,
          name: `Default Inactive ${RandomGenerator.name(1)}`,
          description: RandomGenerator.paragraph({
            sentences: 5,
            wordMin: 3,
            wordMax: 8,
          }),
          isActive: false,
          isDefault: true,
        } satisfies ICommunityPlatformContentPolicyCategory.ICreate,
      },
    );
  typia.assert<ICommunityPlatformContentPolicyCategory>(
    defaultInactiveCategory,
  );

  // Helper to find a summary by code in a page result.
  const findByCode = (
    page: IPageICommunityPlatformContentPolicyCategory.ISummary,
    code: string,
  ): ICommunityPlatformContentPolicyCategory.ISummary | undefined => {
    return page.data.find((item) => item.code === code);
  };

  // Common pagination settings to ensure all test categories fit in the page.
  const page = 1 as number & tags.Type<"int32"> & tags.Minimum<1>;
  const limit = 50 as number & tags.Type<"int32"> & tags.Minimum<1>;

  // 3. Filter with is_default = true
  const pageDefaultTrue: IPageICommunityPlatformContentPolicyCategory.ISummary =
    await api.functional.communityPlatform.platformAdmin.contentPolicyCategories.index(
      connection,
      {
        body: {
          is_default: true,
          page,
          limit,
        } satisfies ICommunityPlatformContentPolicyCategory.IRequest,
      },
    );
  typia.assert<IPageICommunityPlatformContentPolicyCategory.ISummary>(
    pageDefaultTrue,
  );

  // All returned summaries must have is_default === true.
  for (const summary of pageDefaultTrue.data) {
    TestValidator.equals(
      "all results for is_default=true must be default",
      summary.is_default,
      true,
    );
  }

  // The default active category should be present.
  const foundDefaultActive = findByCode(pageDefaultTrue, defaultActiveCode);
  TestValidator.predicate(
    "default active category should appear when filtering is_default=true",
    foundDefaultActive !== undefined,
  );

  // The non-default active category must NOT be present.
  const foundNonDefaultInDefaultTrue = findByCode(
    pageDefaultTrue,
    nonDefaultActiveCode,
  );
  TestValidator.equals(
    "non-default category must not appear when filtering is_default=true",
    foundNonDefaultInDefaultTrue,
    undefined,
  );

  // 4. Filter with is_default = false
  const pageDefaultFalse: IPageICommunityPlatformContentPolicyCategory.ISummary =
    await api.functional.communityPlatform.platformAdmin.contentPolicyCategories.index(
      connection,
      {
        body: {
          is_default: false,
          page,
          limit,
        } satisfies ICommunityPlatformContentPolicyCategory.IRequest,
      },
    );
  typia.assert<IPageICommunityPlatformContentPolicyCategory.ISummary>(
    pageDefaultFalse,
  );

  // All returned summaries must have is_default === false.
  for (const summary of pageDefaultFalse.data) {
    TestValidator.equals(
      "all results for is_default=false must be non-default",
      summary.is_default,
      false,
    );
  }

  // The non-default active category should be present.
  const foundNonDefaultActive = findByCode(
    pageDefaultFalse,
    nonDefaultActiveCode,
  );
  TestValidator.predicate(
    "non-default active category should appear when filtering is_default=false",
    foundNonDefaultActive !== undefined,
  );

  // The default active category must NOT be present.
  const foundDefaultInDefaultFalse = findByCode(
    pageDefaultFalse,
    defaultActiveCode,
  );
  TestValidator.equals(
    "default category must not appear when filtering is_default=false",
    foundDefaultInDefaultFalse,
    undefined,
  );

  // 5. Combined filter: is_default = true AND is_active = true
  const pageDefaultTrueActiveTrue: IPageICommunityPlatformContentPolicyCategory.ISummary =
    await api.functional.communityPlatform.platformAdmin.contentPolicyCategories.index(
      connection,
      {
        body: {
          is_default: true,
          is_active: true,
          page,
          limit,
        } satisfies ICommunityPlatformContentPolicyCategory.IRequest,
      },
    );
  typia.assert<IPageICommunityPlatformContentPolicyCategory.ISummary>(
    pageDefaultTrueActiveTrue,
  );

  for (const summary of pageDefaultTrueActiveTrue.data) {
    TestValidator.equals(
      "combined filter is_default=true & is_active=true should only return default categories",
      summary.is_default,
      true,
    );
    TestValidator.equals(
      "combined filter is_default=true & is_active=true should only return active categories",
      summary.is_active,
      true,
    );
  }

  // The default active category should be present.
  const foundDefaultActiveInCombined = findByCode(
    pageDefaultTrueActiveTrue,
    defaultActiveCode,
  );
  TestValidator.predicate(
    "default active category should appear when filtering is_default=true & is_active=true",
    foundDefaultActiveInCombined !== undefined,
  );

  // The default inactive category must NOT be present.
  const foundDefaultInactiveInCombined = findByCode(
    pageDefaultTrueActiveTrue,
    defaultInactiveCode,
  );
  TestValidator.equals(
    "default inactive category must not appear when filtering is_default=true & is_active=true",
    foundDefaultInactiveInCombined,
    undefined,
  );
}
