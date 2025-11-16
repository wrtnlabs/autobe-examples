import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformKarmaScore } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformKarmaScore";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformKarmaScore } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformKarmaScore";

/**
 * Test pagination functionality for navigating through karma score results.
 *
 * This test validates that administrators can efficiently browse large result
 * sets by controlling page size and navigating between pages. The test covers:
 *
 * 1. Authenticating as an administrator
 * 2. Testing various limit values (1, 10, 50, 100) to verify max limit of 100 is
 *    respected
 * 3. Testing page navigation (pages 1, 2, 3) and verifying pagination metadata
 * 4. Testing navigation beyond available pages returns empty results gracefully
 */
export async function test_api_karma_scores_administrator_pagination_navigation(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as administrator
  const admin: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphabets(12),
        username: RandomGenerator.alphabets(10),
        name: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: null,
        ip: null,
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(admin);

  // Step 2: Test limit value of 1
  const page1Limit1: IPageICommunityPlatformKarmaScore.ISummary =
    await api.functional.communityPlatform.administrator.karmaScores.index(
      connection,
      {
        body: {
          page: 1,
          limit: 1,
        } satisfies ICommunityPlatformKarmaScore.IRequest,
      },
    );
  typia.assert(page1Limit1);
  TestValidator.equals(
    "limit 1 returns correct limit",
    page1Limit1.pagination.limit,
    1,
  );
  TestValidator.equals("page 1 is correct", page1Limit1.pagination.current, 1);
  TestValidator.predicate(
    "data array has at most 1 item",
    page1Limit1.data.length <= 1,
  );

  // Step 3: Test limit value of 10
  const page1Limit10: IPageICommunityPlatformKarmaScore.ISummary =
    await api.functional.communityPlatform.administrator.karmaScores.index(
      connection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformKarmaScore.IRequest,
      },
    );
  typia.assert(page1Limit10);
  TestValidator.equals(
    "limit 10 returns correct limit",
    page1Limit10.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "data array has at most 10 items",
    page1Limit10.data.length <= 10,
  );

  // Step 4: Test limit value of 50
  const page1Limit50: IPageICommunityPlatformKarmaScore.ISummary =
    await api.functional.communityPlatform.administrator.karmaScores.index(
      connection,
      {
        body: {
          page: 1,
          limit: 50,
        } satisfies ICommunityPlatformKarmaScore.IRequest,
      },
    );
  typia.assert(page1Limit50);
  TestValidator.equals(
    "limit 50 returns correct limit",
    page1Limit50.pagination.limit,
    50,
  );
  TestValidator.predicate(
    "data array has at most 50 items",
    page1Limit50.data.length <= 50,
  );

  // Step 5: Test limit value of 100 (maximum allowed)
  const page1Limit100: IPageICommunityPlatformKarmaScore.ISummary =
    await api.functional.communityPlatform.administrator.karmaScores.index(
      connection,
      {
        body: {
          page: 1,
          limit: 100,
        } satisfies ICommunityPlatformKarmaScore.IRequest,
      },
    );
  typia.assert(page1Limit100);
  TestValidator.equals(
    "limit 100 returns correct limit",
    page1Limit100.pagination.limit,
    100,
  );
  TestValidator.predicate(
    "data array has at most 100 items",
    page1Limit100.data.length <= 100,
  );

  // Step 6: Test page navigation - retrieve page 2 with limit 10
  const totalRecords = page1Limit10.pagination.records;
  const totalPages = page1Limit10.pagination.pages;

  if (totalPages >= 2) {
    const page2Limit10: IPageICommunityPlatformKarmaScore.ISummary =
      await api.functional.communityPlatform.administrator.karmaScores.index(
        connection,
        {
          body: {
            page: 2,
            limit: 10,
          } satisfies ICommunityPlatformKarmaScore.IRequest,
        },
      );
    typia.assert(page2Limit10);
    TestValidator.equals(
      "page 2 is correct",
      page2Limit10.pagination.current,
      2,
    );
    TestValidator.equals(
      "total records match",
      page2Limit10.pagination.records,
      totalRecords,
    );
    TestValidator.equals(
      "total pages match",
      page2Limit10.pagination.pages,
      totalPages,
    );
    TestValidator.predicate(
      "page 2 data is different from page 1",
      JSON.stringify(page2Limit10.data) !== JSON.stringify(page1Limit10.data),
    );
  }

  // Step 7: Test page navigation - retrieve page 3 with limit 10
  if (totalPages >= 3) {
    const page3Limit10: IPageICommunityPlatformKarmaScore.ISummary =
      await api.functional.communityPlatform.administrator.karmaScores.index(
        connection,
        {
          body: {
            page: 3,
            limit: 10,
          } satisfies ICommunityPlatformKarmaScore.IRequest,
        },
      );
    typia.assert(page3Limit10);
    TestValidator.equals(
      "page 3 is correct",
      page3Limit10.pagination.current,
      3,
    );
    TestValidator.equals(
      "total records match on page 3",
      page3Limit10.pagination.records,
      totalRecords,
    );
  }

  // Step 8: Test requesting beyond available pages
  const beyondPageNumber = totalPages + 10;
  const beyondPage: IPageICommunityPlatformKarmaScore.ISummary =
    await api.functional.communityPlatform.administrator.karmaScores.index(
      connection,
      {
        body: {
          page: beyondPageNumber,
          limit: 10,
        } satisfies ICommunityPlatformKarmaScore.IRequest,
      },
    );
  typia.assert(beyondPage);
  TestValidator.predicate(
    "beyond page returns empty data array gracefully",
    beyondPage.data.length === 0,
  );
  TestValidator.equals(
    "pagination shows correct page number even when beyond range",
    beyondPage.pagination.current,
    beyondPageNumber,
  );
  TestValidator.equals(
    "total records remain consistent",
    beyondPage.pagination.records,
    totalRecords,
  );

  // Step 9: Verify pagination metadata calculation
  const page1With10: IPageICommunityPlatformKarmaScore.ISummary =
    await api.functional.communityPlatform.administrator.karmaScores.index(
      connection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformKarmaScore.IRequest,
      },
    );
  typia.assert(page1With10);
  const expectedPages = Math.ceil(
    page1With10.pagination.records / page1With10.pagination.limit,
  );
  TestValidator.equals(
    "total pages calculation is correct",
    page1With10.pagination.pages,
    expectedPages,
  );
}
