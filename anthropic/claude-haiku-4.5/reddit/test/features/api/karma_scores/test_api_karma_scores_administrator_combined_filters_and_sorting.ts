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
 * Test combining multiple filters with sorting to create complex queries.
 *
 * This test validates that administrators can create sophisticated searches by
 * combining karma range filters with timestamp range filters and sorting. Tests
 * filtering for members with specific karma ranges, date ranges, and various
 * sort orders.
 *
 * Steps:
 *
 * 1. Authenticate as administrator
 * 2. Query karma scores with combined total_karma and post_karma filters, sorted
 *    by post_karma descending
 * 3. Query with comment_karma range and date range filters, sorted by updated_at
 *    ascending
 * 4. Query with all filter types combined, sorted by total_karma descending
 * 5. Verify pagination works correctly with filters and sorting
 * 6. Validate result ordering matches the requested sort criteria
 */
export async function test_api_karma_scores_administrator_combined_filters_and_sorting(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as administrator
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphabets(12);
  const adminHref = typia.random<string & tags.Format<"uri">>();

  const admin: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        username: RandomGenerator.alphabets(8),
        name: RandomGenerator.name(),
        href: adminHref,
        referrer: undefined,
        ip: undefined,
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(admin);

  // Step 2: Query with combined total_karma and post_karma filters, sorted by post_karma descending
  const minTotalKarma = 100;
  const maxTotalKarma = 500;
  const minPostKarma = 50;
  const maxPostKarma = 300;

  const resultsPostKarmaDesc: IPageICommunityPlatformKarmaScore.ISummary =
    await api.functional.communityPlatform.administrator.karmaScores.index(
      connection,
      {
        body: {
          page: 1,
          limit: 20,
          orderBy: "post_karma",
          order: "desc",
          minTotalKarma,
          maxTotalKarma,
          minPostKarma,
          maxPostKarma,
        } satisfies ICommunityPlatformKarmaScore.IRequest,
      },
    );
  typia.assert(resultsPostKarmaDesc);
  TestValidator.predicate(
    "post_karma descending results have valid pagination",
    resultsPostKarmaDesc.pagination.current > 0 &&
      resultsPostKarmaDesc.pagination.limit > 0 &&
      resultsPostKarmaDesc.pagination.records >= 0 &&
      resultsPostKarmaDesc.pagination.pages >= 0,
  );

  // Verify post_karma descending ordering
  for (let i = 0; i < resultsPostKarmaDesc.data.length - 1; i++) {
    TestValidator.predicate(
      `post_karma order maintained at index ${i}`,
      resultsPostKarmaDesc.data[i].post_karma >=
        resultsPostKarmaDesc.data[i + 1].post_karma,
    );
  }

  // Verify karma range filters are applied
  for (const score of resultsPostKarmaDesc.data) {
    TestValidator.predicate(
      "total_karma within range",
      score.total_karma >= minTotalKarma && score.total_karma <= maxTotalKarma,
    );
    TestValidator.predicate(
      "post_karma within range",
      score.post_karma >= minPostKarma && score.post_karma <= maxPostKarma,
    );
  }

  // Step 3: Query with comment_karma range and date range filters, sorted by updated_at ascending
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const minCommentKarma = 0;
  const maxCommentKarma = 200;

  const resultsUpdatedAscending: IPageICommunityPlatformKarmaScore.ISummary =
    await api.functional.communityPlatform.administrator.karmaScores.index(
      connection,
      {
        body: {
          page: 1,
          limit: 15,
          orderBy: "updated_at",
          order: "asc",
          minCommentKarma,
          maxCommentKarma,
          updatedAfter: thirtyDaysAgo.toISOString(),
          updatedBefore: now.toISOString(),
        } satisfies ICommunityPlatformKarmaScore.IRequest,
      },
    );
  typia.assert(resultsUpdatedAscending);
  TestValidator.predicate(
    "updated_at ascending results have valid data",
    resultsUpdatedAscending.data.length >= 0,
  );

  // Verify comment_karma range filter
  for (const score of resultsUpdatedAscending.data) {
    TestValidator.predicate(
      "comment_karma within range",
      score.comment_karma >= minCommentKarma &&
        score.comment_karma <= maxCommentKarma,
    );
  }

  // Verify updated_at ordering (ascending)
  for (let i = 0; i < resultsUpdatedAscending.data.length - 1; i++) {
    const current = new Date(resultsUpdatedAscending.data[i].updated_at);
    const next = new Date(resultsUpdatedAscending.data[i + 1].updated_at);
    TestValidator.predicate(
      `updated_at ascending order maintained at index ${i}`,
      current.getTime() <= next.getTime(),
    );
  }

  // Step 4: Query with all filter types combined, sorted by total_karma descending
  const complexResults: IPageICommunityPlatformKarmaScore.ISummary =
    await api.functional.communityPlatform.administrator.karmaScores.index(
      connection,
      {
        body: {
          page: 1,
          limit: 25,
          orderBy: "total_karma",
          order: "desc",
          minTotalKarma: 150,
          maxTotalKarma: 400,
          minPostKarma: 50,
          maxPostKarma: 250,
          minCommentKarma: 30,
          maxCommentKarma: 180,
          updatedAfter: thirtyDaysAgo.toISOString(),
          updatedBefore: now.toISOString(),
        } satisfies ICommunityPlatformKarmaScore.IRequest,
      },
    );
  typia.assert(complexResults);
  TestValidator.predicate(
    "complex filtered results contain valid data",
    Array.isArray(complexResults.data),
  );

  // Verify all filters applied correctly
  for (const score of complexResults.data) {
    TestValidator.predicate(
      "total_karma in complex filter range",
      score.total_karma >= 150 && score.total_karma <= 400,
    );
    TestValidator.predicate(
      "post_karma in complex filter range",
      score.post_karma >= 50 && score.post_karma <= 250,
    );
    TestValidator.predicate(
      "comment_karma in complex filter range",
      score.comment_karma >= 30 && score.comment_karma <= 180,
    );

    const scoreDate = new Date(score.updated_at);
    TestValidator.predicate(
      "updated_at in complex filter range",
      scoreDate >= thirtyDaysAgo && scoreDate <= now,
    );
  }

  // Verify total_karma descending ordering
  for (let i = 0; i < complexResults.data.length - 1; i++) {
    TestValidator.predicate(
      `total_karma descending order at index ${i}`,
      complexResults.data[i].total_karma >=
        complexResults.data[i + 1].total_karma,
    );
  }

  // Step 5: Verify pagination with filters and sorting
  TestValidator.predicate(
    "pagination metadata is accurate for complex query",
    complexResults.pagination.current >= 1 &&
      complexResults.pagination.limit > 0 &&
      complexResults.pagination.records >= 0 &&
      complexResults.pagination.pages ===
        Math.ceil(
          complexResults.pagination.records / complexResults.pagination.limit,
        ),
  );

  // Step 6: Test different sort orders with same filter set
  const sortByCommentKarmaDesc: IPageICommunityPlatformKarmaScore.ISummary =
    await api.functional.communityPlatform.administrator.karmaScores.index(
      connection,
      {
        body: {
          page: 1,
          limit: 20,
          orderBy: "comment_karma",
          order: "desc",
          minTotalKarma: 100,
          maxTotalKarma: 500,
        } satisfies ICommunityPlatformKarmaScore.IRequest,
      },
    );
  typia.assert(sortByCommentKarmaDesc);

  // Verify comment_karma descending
  for (let i = 0; i < sortByCommentKarmaDesc.data.length - 1; i++) {
    TestValidator.predicate(
      `comment_karma descending at index ${i}`,
      sortByCommentKarmaDesc.data[i].comment_karma >=
        sortByCommentKarmaDesc.data[i + 1].comment_karma,
    );
  }
}
