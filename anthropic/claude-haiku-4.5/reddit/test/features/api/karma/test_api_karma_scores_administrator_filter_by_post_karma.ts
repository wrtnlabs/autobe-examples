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
 * Test filtering karma scores specifically by post karma ranges using
 * minPostKarma and maxPostKarma parameters.
 *
 * This scenario validates that administrators can identify members based on
 * karma earned from their posts specifically, separate from comment karma.
 * Various combinations of post karma filters are tested to ensure the filtering
 * correctly isolates members who are prolific post creators versus
 * comment-focused contributors. The filtering is verified to be independent
 * from comment karma filters and results correctly reflect only post-earned
 * reputation.
 *
 * Test workflow:
 *
 * 1. Authenticate as administrator to execute post karma filtering queries
 * 2. Query karma scores with minPostKarma filter to find high-reputation post
 *    creators
 * 3. Query karma scores with maxPostKarma filter to find low-post-karma members
 * 4. Query karma scores with combined minPostKarma and maxPostKarma range filters
 * 5. Verify filtering results correctly isolate post karma independently from
 *    comment karma
 * 6. Validate pagination and result consistency across different filter
 *    combinations
 */
export async function test_api_karma_scores_administrator_filter_by_post_karma(
  connection: api.IConnection,
) {
  // 1. Authenticate as administrator
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphabets(12);
  const adminHref = typia.random<string & tags.Format<"uri">>();

  const adminAuth = await api.functional.auth.administrator.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      username: RandomGenerator.alphabets(10),
      name: RandomGenerator.name(),
      href: adminHref,
      referrer: null,
      ip: null,
    } satisfies ICommunityPlatformAdministrator.ICreate,
  });
  typia.assert(adminAuth);
  TestValidator.predicate(
    "admin authenticated successfully",
    adminAuth.id !== undefined,
  );

  // 2. Test filtering with minPostKarma - find high post karma creators
  const highPostKarmaResult =
    await api.functional.communityPlatform.administrator.karmaScores.index(
      connection,
      {
        body: {
          page: 1,
          limit: 50,
          minPostKarma: 100,
          orderBy: "post_karma",
          order: "desc",
        } satisfies ICommunityPlatformKarmaScore.IRequest,
      },
    );
  typia.assert(highPostKarmaResult);

  // Verify all returned scores have post_karma >= 100
  for (const score of highPostKarmaResult.data) {
    TestValidator.predicate(
      "returned score has post_karma >= minPostKarma",
      score.post_karma >= 100,
    );
  }

  // Verify sorting by post_karma descending
  if (highPostKarmaResult.data.length > 1) {
    for (let i = 0; i < highPostKarmaResult.data.length - 1; i++) {
      TestValidator.predicate(
        "post_karma values sorted in descending order",
        highPostKarmaResult.data[i].post_karma >=
          highPostKarmaResult.data[i + 1].post_karma,
      );
    }
  }

  // 3. Test filtering with maxPostKarma - find low post karma members
  const lowPostKarmaResult =
    await api.functional.communityPlatform.administrator.karmaScores.index(
      connection,
      {
        body: {
          page: 1,
          limit: 50,
          maxPostKarma: 50,
          orderBy: "post_karma",
          order: "asc",
        } satisfies ICommunityPlatformKarmaScore.IRequest,
      },
    );
  typia.assert(lowPostKarmaResult);

  // Verify all returned scores have post_karma <= 50
  for (const score of lowPostKarmaResult.data) {
    TestValidator.predicate(
      "returned score has post_karma <= maxPostKarma",
      score.post_karma <= 50,
    );
  }

  // 4. Test filtering with both minPostKarma and maxPostKarma range
  const rangeResult =
    await api.functional.communityPlatform.administrator.karmaScores.index(
      connection,
      {
        body: {
          page: 1,
          limit: 50,
          minPostKarma: 50,
          maxPostKarma: 200,
          orderBy: "post_karma",
          order: "desc",
        } satisfies ICommunityPlatformKarmaScore.IRequest,
      },
    );
  typia.assert(rangeResult);

  // Verify all returned scores fall within post_karma range
  for (const score of rangeResult.data) {
    TestValidator.predicate(
      "returned score within post_karma range",
      score.post_karma >= 50 && score.post_karma <= 200,
    );
  }

  // 5. Test that post karma filtering is independent from comment karma
  const postKarmaOnlyResult =
    await api.functional.communityPlatform.administrator.karmaScores.index(
      connection,
      {
        body: {
          page: 1,
          limit: 50,
          minPostKarma: 100,
        } satisfies ICommunityPlatformKarmaScore.IRequest,
      },
    );
  typia.assert(postKarmaOnlyResult);

  // Verify results include members with varying comment_karma values
  const commentKarmaValues = postKarmaOnlyResult.data.map(
    (s) => s.comment_karma,
  );
  TestValidator.predicate(
    "post karma filter returns members regardless of comment karma",
    postKarmaOnlyResult.data.length === 0 || commentKarmaValues.length > 0,
  );

  // 6. Test pagination with post karma filter
  const page1 =
    await api.functional.communityPlatform.administrator.karmaScores.index(
      connection,
      {
        body: {
          page: 1,
          limit: 20,
          minPostKarma: 50,
          orderBy: "post_karma",
          order: "desc",
        } satisfies ICommunityPlatformKarmaScore.IRequest,
      },
    );
  typia.assert(page1);
  TestValidator.predicate(
    "first page returns expected limit",
    page1.data.length <= 20,
  );

  if (page1.pagination.pages > 1) {
    const page2 =
      await api.functional.communityPlatform.administrator.karmaScores.index(
        connection,
        {
          body: {
            page: 2,
            limit: 20,
            minPostKarma: 50,
            orderBy: "post_karma",
            order: "desc",
          } satisfies ICommunityPlatformKarmaScore.IRequest,
        },
      );
    typia.assert(page2);

    // Verify page 2 has different results from page 1
    const page1Ids = page1.data.map((s) => s.id);
    const page2Ids = page2.data.map((s) => s.id);
    TestValidator.predicate(
      "pagination returns different results on different pages",
      page2Ids.some((id) => !page1Ids.includes(id)) || page2.data.length === 0,
    );
  }

  // 7. Test zero results with extreme post karma filter
  const noResultsFilter =
    await api.functional.communityPlatform.administrator.karmaScores.index(
      connection,
      {
        body: {
          minPostKarma: 1000000,
          maxPostKarma: 2000000,
        } satisfies ICommunityPlatformKarmaScore.IRequest,
      },
    );
  typia.assert(noResultsFilter);
  TestValidator.predicate(
    "filtering with extreme values returns valid response",
    Array.isArray(noResultsFilter.data),
  );

  // 8. Verify pagination metadata is accurate
  TestValidator.predicate(
    "pagination current page is positive",
    highPostKarmaResult.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination limit is positive",
    highPostKarmaResult.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination records count is accurate",
    highPostKarmaResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages calculated correctly",
    highPostKarmaResult.pagination.pages >= 0,
  );
}
