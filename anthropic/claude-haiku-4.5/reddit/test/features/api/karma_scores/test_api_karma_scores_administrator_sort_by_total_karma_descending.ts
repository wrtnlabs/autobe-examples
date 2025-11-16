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
 * Test sorting karma scores by total_karma in descending order (highest
 * reputation first). This scenario validates that an administrator can identify
 * the highest-reputation members on the platform by sorting results with
 * orderBy='total_karma' and order='desc'. Verify that members appear in the
 * correct order from highest to lowest total karma scores, and that pagination
 * respects the sort order across multiple pages. This sorting enables
 * identification of most-trusted community members.
 */
export async function test_api_karma_scores_administrator_sort_by_total_karma_descending(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as administrator
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password: "SecurePassword123",
        username: RandomGenerator.alphaNumeric(12),
        name: RandomGenerator.name(),
        href: "https://example.com/admin",
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(admin);

  // Step 2: Retrieve karma scores sorted by total_karma in descending order (first page)
  const firstPage: IPageICommunityPlatformKarmaScore.ISummary =
    await api.functional.communityPlatform.administrator.karmaScores.index(
      connection,
      {
        body: {
          page: 1,
          limit: 10,
          orderBy: "total_karma",
          order: "desc",
        } satisfies ICommunityPlatformKarmaScore.IRequest,
      },
    );
  typia.assert(firstPage);

  // Step 3: Validate that first page has data
  TestValidator.predicate(
    "first page should contain karma score records",
    firstPage.data.length > 0,
  );

  // Step 4: Verify descending order on first page
  const firstPageOrdered = firstPage.data.every((current, index, array) => {
    if (index === 0) return true;
    return array[index - 1].total_karma >= current.total_karma;
  });
  TestValidator.predicate(
    "first page karma scores should be sorted by total_karma in descending order",
    firstPageOrdered,
  );

  // Step 5: Verify highest karma is first
  if (firstPage.data.length >= 2) {
    TestValidator.predicate(
      "first karma score should be highest in first page",
      firstPage.data[0].total_karma >= firstPage.data[1].total_karma,
    );
  }

  // Step 6: Retrieve second page to verify sorting consistency across pages
  if (firstPage.pagination.pages > 1) {
    const secondPage: IPageICommunityPlatformKarmaScore.ISummary =
      await api.functional.communityPlatform.administrator.karmaScores.index(
        connection,
        {
          body: {
            page: 2,
            limit: 10,
            orderBy: "total_karma",
            order: "desc",
          } satisfies ICommunityPlatformKarmaScore.IRequest,
        },
      );
    typia.assert(secondPage);

    // Step 7: Verify that last item on page 1 has karma >= first item on page 2
    const lastFirstPageKarma =
      firstPage.data[firstPage.data.length - 1].total_karma;
    const firstSecondPageKarma = secondPage.data[0].total_karma;

    TestValidator.predicate(
      "last item on first page should have karma >= first item on second page",
      lastFirstPageKarma >= firstSecondPageKarma,
    );

    // Step 8: Verify descending order on second page
    const secondPageOrdered = secondPage.data.every((current, index, array) => {
      if (index === 0) return true;
      return array[index - 1].total_karma >= current.total_karma;
    });
    TestValidator.predicate(
      "second page karma scores should be sorted by total_karma in descending order",
      secondPageOrdered,
    );
  }

  // Step 9: Verify pagination metadata
  TestValidator.predicate(
    "pagination current page should be 1",
    firstPage.pagination.current === 1,
  );
  TestValidator.predicate(
    "pagination limit should be 10",
    firstPage.pagination.limit === 10,
  );
  TestValidator.predicate(
    "pagination records should be non-negative",
    firstPage.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages should be non-negative",
    firstPage.pagination.pages >= 0,
  );

  // Step 10: Verify business logic - total_karma equals sum of post and comment karma
  firstPage.data.forEach((karmaScore, index) => {
    TestValidator.equals(
      `karma score at index ${index} total_karma should equal post_karma + comment_karma`,
      karmaScore.total_karma,
      karmaScore.post_karma + karmaScore.comment_karma,
    );
  });
}
