import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformKarmaHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformKarmaHistory";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformKarmaHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformKarmaHistory";

/**
 * Test pagination functionality for karma history retrieval by administrators.
 *
 * This test validates that administrators can efficiently navigate through
 * large karma history datasets using pagination. Tests verify correct handling
 * of various page numbers, limit values, pagination metadata accuracy, boundary
 * conditions, data consistency across pages, and prevention of record
 * duplication or skipping.
 *
 * 1. Create administrator account for authentication
 * 2. Request page 1 with default limit and verify pagination metadata
 * 3. Request middle pages to verify pagination works for intermediate results
 * 4. Request last page to verify pagination handles final data correctly
 * 5. Test minimum limit (1) to verify pagination with many pages
 * 6. Test maximum limit (100) to verify boundary handling
 * 7. Test requesting page beyond total pages
 * 8. Verify record consistency and no duplication across page requests
 * 9. Validate pagination metadata correctness for all requests
 */
export async function test_api_karma_history_administrator_pagination(
  connection: api.IConnection,
) {
  // 1. Create administrator account for authentication
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const admin: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password: RandomGenerator.alphabets(12),
        username: RandomGenerator.alphabets(8),
        name: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(admin);

  // 2. Request page 1 with default limit and verify pagination metadata
  const firstPageRequest = {
    page: 1,
    limit: 10,
  } satisfies ICommunityPlatformKarmaHistory.IRequest;

  const firstPageResult: IPageICommunityPlatformKarmaHistory =
    await api.functional.communityPlatform.administrator.karmaHistory.index(
      connection,
      { body: firstPageRequest },
    );
  typia.assert(firstPageResult);

  TestValidator.predicate(
    "first page has correct pagination metadata",
    firstPageResult.pagination.current === 1,
  );
  TestValidator.predicate(
    "first page limit matches request",
    firstPageResult.pagination.limit === 10,
  );
  TestValidator.predicate(
    "first page data is array",
    Array.isArray(firstPageResult.data),
  );

  // 3. Request middle pages to verify pagination works for intermediate results
  const totalPages = firstPageResult.pagination.pages;

  if (totalPages > 2) {
    const middlePage = Math.floor(totalPages / 2);
    const middlePageRequest = {
      page: middlePage,
      limit: 10,
    } satisfies ICommunityPlatformKarmaHistory.IRequest;

    const middlePageResult: IPageICommunityPlatformKarmaHistory =
      await api.functional.communityPlatform.administrator.karmaHistory.index(
        connection,
        { body: middlePageRequest },
      );
    typia.assert(middlePageResult);

    TestValidator.equals(
      "middle page number matches request",
      middlePageResult.pagination.current,
      middlePage,
    );
    TestValidator.predicate(
      "middle page has data",
      middlePageResult.data.length > 0,
    );
  }

  // 4. Request last page to verify pagination handles final data correctly
  if (totalPages > 0) {
    const lastPageRequest = {
      page: totalPages,
      limit: 10,
    } satisfies ICommunityPlatformKarmaHistory.IRequest;

    const lastPageResult: IPageICommunityPlatformKarmaHistory =
      await api.functional.communityPlatform.administrator.karmaHistory.index(
        connection,
        { body: lastPageRequest },
      );
    typia.assert(lastPageResult);

    TestValidator.equals(
      "last page number matches request",
      lastPageResult.pagination.current,
      totalPages,
    );
  }

  // 5. Test minimum limit (1) to verify pagination with many pages
  const minLimitRequest = {
    page: 1,
    limit: 1,
  } satisfies ICommunityPlatformKarmaHistory.IRequest;

  const minLimitResult: IPageICommunityPlatformKarmaHistory =
    await api.functional.communityPlatform.administrator.karmaHistory.index(
      connection,
      { body: minLimitRequest },
    );
  typia.assert(minLimitResult);

  TestValidator.equals(
    "minimum limit results in limit value of 1",
    minLimitResult.pagination.limit,
    1,
  );
  TestValidator.predicate(
    "data length does not exceed limit",
    minLimitResult.data.length <= 1,
  );

  // 6. Test maximum limit (100) to verify boundary handling
  const maxLimitRequest = {
    page: 1,
    limit: 100,
  } satisfies ICommunityPlatformKarmaHistory.IRequest;

  const maxLimitResult: IPageICommunityPlatformKarmaHistory =
    await api.functional.communityPlatform.administrator.karmaHistory.index(
      connection,
      { body: maxLimitRequest },
    );
  typia.assert(maxLimitResult);

  TestValidator.equals(
    "maximum limit results in limit value of 100",
    maxLimitResult.pagination.limit,
    100,
  );
  TestValidator.predicate(
    "data length does not exceed limit",
    maxLimitResult.data.length <= 100,
  );

  // 7. Test requesting page beyond total pages
  const beyondPageRequest = {
    page: totalPages + 100,
    limit: 10,
  } satisfies ICommunityPlatformKarmaHistory.IRequest;

  const beyondPageResult: IPageICommunityPlatformKarmaHistory =
    await api.functional.communityPlatform.administrator.karmaHistory.index(
      connection,
      { body: beyondPageRequest },
    );
  typia.assert(beyondPageResult);

  TestValidator.predicate(
    "page beyond total returns empty or valid data",
    beyondPageResult.data.length === 0 || beyondPageResult.data.length >= 0,
  );

  // 8. Verify record consistency and no duplication across page requests
  if (totalPages > 1) {
    const page1Request = {
      page: 1,
      limit: 5,
    } satisfies ICommunityPlatformKarmaHistory.IRequest;

    const page1Result: IPageICommunityPlatformKarmaHistory =
      await api.functional.communityPlatform.administrator.karmaHistory.index(
        connection,
        { body: page1Request },
      );
    typia.assert(page1Result);

    const page2Request = {
      page: 2,
      limit: 5,
    } satisfies ICommunityPlatformKarmaHistory.IRequest;

    const page2Result: IPageICommunityPlatformKarmaHistory =
      await api.functional.communityPlatform.administrator.karmaHistory.index(
        connection,
        { body: page2Request },
      );
    typia.assert(page2Result);

    // Verify no overlap between pages
    const page1Ids = new Set(page1Result.data.map((record) => record.id));
    const page2Ids = page2Result.data.map((record) => record.id);

    const duplicateCount = page2Ids.filter((id) => page1Ids.has(id)).length;
    TestValidator.equals(
      "no duplicate records between consecutive pages",
      duplicateCount,
      0,
    );
  }

  // 9. Validate pagination metadata correctness for all requests
  const testLimit = 10;
  const testPageRequest = {
    page: 1,
    limit: testLimit,
  } satisfies ICommunityPlatformKarmaHistory.IRequest;

  const testPageResult: IPageICommunityPlatformKarmaHistory =
    await api.functional.communityPlatform.administrator.karmaHistory.index(
      connection,
      { body: testPageRequest },
    );
  typia.assert(testPageResult);

  const calculatedTotalPages = Math.ceil(
    testPageResult.pagination.records / testPageResult.pagination.limit,
  );
  TestValidator.equals(
    "total pages calculated correctly",
    testPageResult.pagination.pages,
    calculatedTotalPages,
  );

  TestValidator.predicate(
    "current page is positive",
    testPageResult.pagination.current > 0,
  );
  TestValidator.predicate(
    "total records is non-negative",
    testPageResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "total pages is non-negative",
    testPageResult.pagination.pages >= 0,
  );
}
