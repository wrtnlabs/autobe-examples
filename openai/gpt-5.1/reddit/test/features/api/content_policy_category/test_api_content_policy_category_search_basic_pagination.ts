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
 * Validate that a platform administrator can list content policy categories
 * with basic pagination using PATCH
 * `/communityPlatform/platformAdmin/contentPolicyCategories`.
 *
 * Business scenario:
 *
 * - A newly registered platform admin should be able to define multiple global
 *   content policy categories (harassment, hate_speech, spam, etc.).
 * - The admin UI then calls the search/list endpoint with simple pagination to
 *   show these categories in a paginated table.
 *
 * This test covers the happy-path workflow for the list operation with
 * default-like filters and explicit pagination parameters.
 *
 * Steps:
 *
 * 1. Register a platform admin using POST `/auth/platformAdmin/join`.
 * 2. Seed several content policy categories using POST
 *    `/communityPlatform/platformAdmin/contentPolicyCategories` with distinct
 *    codes and flag configurations.
 * 3. Call PATCH `/communityPlatform/platformAdmin/contentPolicyCategories` with an
 *    `ICommunityPlatformContentPolicyCategory.IRequest` body specifying `page`
 *    and `limit` but omitting search and filter flags to simulate a basic list
 *    view.
 * 4. Verify that the response is a valid
 *    `IPageICommunityPlatformContentPolicyCategory.ISummary` instance and that
 *    pagination metadata aligns with the request.
 * 5. Confirm that the returned data page contains some of the seeded categories
 *    and does not exceed the requested limit.
 * 6. If enough categories were seeded, request a second page and confirm that
 *    records are correctly paginated without overlapping items across pages.
 */
export async function test_api_content_policy_category_search_basic_pagination(
  connection: api.IConnection,
) {
  // 1. Register a platform admin (authentication setup)
  const joinBody = {
    username: RandomGenerator.alphabets(12),
    email: `${RandomGenerator.alphabets(8)}@example.com`,
    password: RandomGenerator.alphaNumeric(16),
    displayName: RandomGenerator.name(),
    href: "https://admin.example.com/register",
    referrer: "https://admin.example.com/landing",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const admin: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert(admin);

  // 2. Seed several content policy categories
  const seedCount = 5;
  const createdCategories: ICommunityPlatformContentPolicyCategory[] = [];

  for (let i = 0; i < seedCount; i++) {
    const isActive = i % 2 === 0;
    const isDefault = i % 3 === 0;

    const createBody = {
      code: `test_category_${RandomGenerator.alphaNumeric(10)}_${i}`,
      name: RandomGenerator.paragraph({ sentences: 2 }),
      description: RandomGenerator.content({
        paragraphs: 1,
        sentenceMin: 5,
        sentenceMax: 10,
        wordMin: 3,
        wordMax: 8,
      }),
      isActive,
      isDefault,
    } satisfies ICommunityPlatformContentPolicyCategory.ICreate;

    const created =
      await api.functional.communityPlatform.platformAdmin.contentPolicyCategories.create(
        connection,
        { body: createBody },
      );
    typia.assert(created);
    createdCategories.push(created);
  }

  TestValidator.predicate(
    "at least one content policy category should be created",
    createdCategories.length > 0,
  );

  // 3. Basic pagination: first page
  const limit = 2;
  const page1Body = {
    page: 1,
    limit,
  } satisfies ICommunityPlatformContentPolicyCategory.IRequest;

  const page1: IPageICommunityPlatformContentPolicyCategory.ISummary =
    await api.functional.communityPlatform.platformAdmin.contentPolicyCategories.index(
      connection,
      { body: page1Body },
    );
  typia.assert(page1);

  // 4. Validate pagination metadata for page 1
  const pagination1 = page1.pagination;
  TestValidator.equals(
    "pagination.current should match requested page 1",
    pagination1.current,
    page1Body.page,
  );
  TestValidator.equals(
    "pagination.limit should match requested limit",
    pagination1.limit,
    page1Body.limit,
  );
  TestValidator.predicate(
    "data length of page 1 should be > 0 when records exist",
    page1.data.length > 0,
  );
  TestValidator.predicate(
    "data length of page 1 should not exceed limit",
    page1.data.length <= limit,
  );

  // Verify that page1.data items look like valid summaries
  for (const summary of page1.data) {
    typia.assert<ICommunityPlatformContentPolicyCategory.ISummary>(summary);
  }

  // Ensure at least one created category appears in returned data by code
  const page1Codes = page1.data.map((item) => item.code);
  const createdCodes = createdCategories.map((item) => item.code);

  const hasAnySeededOnPage1 = createdCodes.some((code) =>
    page1Codes.includes(code),
  );

  TestValidator.predicate(
    "first page should contain at least one seeded content policy category",
    hasAnySeededOnPage1,
  );

  // 5. Second page checks (only if enough records exist for 2 pages)
  if (pagination1.records > limit) {
    const page2Body = {
      page: 2,
      limit,
    } satisfies ICommunityPlatformContentPolicyCategory.IRequest;

    const page2: IPageICommunityPlatformContentPolicyCategory.ISummary =
      await api.functional.communityPlatform.platformAdmin.contentPolicyCategories.index(
        connection,
        { body: page2Body },
      );
    typia.assert(page2);

    const pagination2 = page2.pagination;
    TestValidator.equals(
      "pagination.current for page 2 should be 2",
      pagination2.current,
      page2Body.page,
    );
    TestValidator.equals(
      "pagination.limit for page 2 should match requested limit",
      pagination2.limit,
      page2Body.limit,
    );

    const page2Ids = page2.data.map((item) => item.id);
    const page1Ids = page1.data.map((item) => item.id);

    const overlap = page2Ids.some((id) => page1Ids.includes(id));

    TestValidator.predicate(
      "page 1 and page 2 should not contain overlapping category IDs",
      overlap === false,
    );

    // Validate pagination.records and pages consistency
    TestValidator.predicate(
      "pagination.records should be at least number of seeded categories",
      pagination2.records >= createdCategories.length,
    );

    if (pagination2.limit > 0) {
      const expectedPages = Math.ceil(pagination2.records / pagination2.limit);
      TestValidator.equals(
        "pagination.pages should be consistent with records and limit",
        pagination2.pages,
        expectedPages,
      );
    }
  }
}
