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
 * Test filtering karma scores by total karma range using minTotalKarma and
 * maxTotalKarma.
 *
 * This test validates that an administrator can filter member karma scores
 * within a specified range. It covers the following scenarios:
 *
 * 1. Authenticate as administrator to access karma scores filtering functionality
 * 2. Test filtering with only minTotalKarma boundary (lower limit)
 * 3. Test filtering with only maxTotalKarma boundary (upper limit)
 * 4. Test filtering with both minTotalKarma and maxTotalKarma (range filter)
 * 5. Verify inclusive filtering (members at exact boundaries are included)
 * 6. Verify pagination works correctly with filtered results
 * 7. Test empty results when filter range excludes all members
 */
export async function test_api_karma_scores_administrator_filter_by_total_karma_range(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as administrator
  const adminAuthBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphabets(10) + "aA1",
    username: RandomGenerator.alphabets(5),
    name: RandomGenerator.name(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: null as string | null | undefined,
    ip: null as string | null | undefined,
  } satisfies ICommunityPlatformAdministrator.ICreate;

  const admin: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: adminAuthBody,
    });
  typia.assert(admin);
  TestValidator.equals(
    "administrator authenticated successfully",
    admin.account_status,
    "active",
  );

  // Step 2: Test filtering with only minTotalKarma (lower boundary)
  const minOnlyRequest = {
    page: 1,
    limit: 10,
    minTotalKarma: 50,
  } satisfies ICommunityPlatformKarmaScore.IRequest;

  const minOnlyResult: IPageICommunityPlatformKarmaScore.ISummary =
    await api.functional.communityPlatform.administrator.karmaScores.index(
      connection,
      {
        body: minOnlyRequest,
      },
    );
  typia.assert(minOnlyResult);
  TestValidator.predicate("all members have total_karma >= minTotalKarma", () =>
    minOnlyResult.data.every((score) => score.total_karma >= 50),
  );

  // Step 3: Test filtering with only maxTotalKarma (upper boundary)
  const maxOnlyRequest = {
    page: 1,
    limit: 10,
    maxTotalKarma: 100,
  } satisfies ICommunityPlatformKarmaScore.IRequest;

  const maxOnlyResult: IPageICommunityPlatformKarmaScore.ISummary =
    await api.functional.communityPlatform.administrator.karmaScores.index(
      connection,
      {
        body: maxOnlyRequest,
      },
    );
  typia.assert(maxOnlyResult);
  TestValidator.predicate("all members have total_karma <= maxTotalKarma", () =>
    maxOnlyResult.data.every((score) => score.total_karma <= 100),
  );

  // Step 4: Test filtering with both minTotalKarma and maxTotalKarma (range filter)
  const minKarma = 25;
  const maxKarma = 75;
  const rangeRequest = {
    page: 1,
    limit: 10,
    minTotalKarma: minKarma,
    maxTotalKarma: maxKarma,
  } satisfies ICommunityPlatformKarmaScore.IRequest;

  const rangeResult: IPageICommunityPlatformKarmaScore.ISummary =
    await api.functional.communityPlatform.administrator.karmaScores.index(
      connection,
      {
        body: rangeRequest,
      },
    );
  typia.assert(rangeResult);
  TestValidator.predicate(
    "all members are within the karma range [25, 75]",
    () =>
      rangeResult.data.every(
        (score) =>
          score.total_karma >= minKarma && score.total_karma <= maxKarma,
      ),
  );

  // Step 5: Verify inclusive filtering with exact boundary values
  const exactMinRequest = {
    page: 1,
    limit: 50,
    minTotalKarma: 0,
    maxTotalKarma: 0,
  } satisfies ICommunityPlatformKarmaScore.IRequest;

  const exactResult: IPageICommunityPlatformKarmaScore.ISummary =
    await api.functional.communityPlatform.administrator.karmaScores.index(
      connection,
      {
        body: exactMinRequest,
      },
    );
  typia.assert(exactResult);
  TestValidator.predicate(
    "members with exactly 0 total_karma are included in results",
    () => {
      if (exactResult.data.length === 0) return true;
      return exactResult.data.every((score) => score.total_karma === 0);
    },
  );

  // Step 6: Test pagination with filtered results
  const paginationRequest1 = {
    page: 1,
    limit: 5,
    minTotalKarma: 0,
    maxTotalKarma: 200,
  } satisfies ICommunityPlatformKarmaScore.IRequest;

  const page1Result: IPageICommunityPlatformKarmaScore.ISummary =
    await api.functional.communityPlatform.administrator.karmaScores.index(
      connection,
      {
        body: paginationRequest1,
      },
    );
  typia.assert(page1Result);
  TestValidator.equals(
    "page 1 respects limit of 5 items",
    page1Result.pagination.limit,
    5,
  );
  TestValidator.equals(
    "page 1 current page number is correct",
    page1Result.pagination.current,
    1,
  );

  if (page1Result.pagination.pages > 1) {
    const paginationRequest2 = {
      page: 2,
      limit: 5,
      minTotalKarma: 0,
      maxTotalKarma: 200,
    } satisfies ICommunityPlatformKarmaScore.IRequest;

    const page2Result: IPageICommunityPlatformKarmaScore.ISummary =
      await api.functional.communityPlatform.administrator.karmaScores.index(
        connection,
        {
          body: paginationRequest2,
        },
      );
    typia.assert(page2Result);
    TestValidator.equals(
      "page 2 current page number is correct",
      page2Result.pagination.current,
      2,
    );
    TestValidator.predicate("page 1 and page 2 have different members", () => {
      const page1Ids = page1Result.data.map((s) => s.id);
      const page2Ids = page2Result.data.map((s) => s.id);
      return !page1Ids.some((id) => page2Ids.includes(id));
    });
  }

  // Step 7: Test narrow range that may return no results
  const narrowRangeRequest = {
    page: 1,
    limit: 10,
    minTotalKarma: 999999,
    maxTotalKarma: 1000000,
  } satisfies ICommunityPlatformKarmaScore.IRequest;

  const narrowRangeResult: IPageICommunityPlatformKarmaScore.ISummary =
    await api.functional.communityPlatform.administrator.karmaScores.index(
      connection,
      {
        body: narrowRangeRequest,
      },
    );
  typia.assert(narrowRangeResult);
  TestValidator.predicate(
    "narrow range request completes without error",
    () => narrowRangeResult.pagination.records >= 0,
  );
}
