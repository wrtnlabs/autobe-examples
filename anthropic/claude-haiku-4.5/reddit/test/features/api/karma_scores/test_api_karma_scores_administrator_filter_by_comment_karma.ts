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
 * Test filtering karma scores specifically by comment karma ranges.
 *
 * Validates that administrators can identify members based on karma earned from
 * their comments specifically. This test ensures the filtering mechanisms for
 * minCommentKarma and maxCommentKarma parameters work correctly, allowing
 * identification of active discussion participants and their contribution
 * patterns.
 *
 * Test scenario:
 *
 * 1. Authenticate as administrator
 * 2. Filter members with minimum comment karma threshold
 * 3. Verify all results meet minimum comment karma requirement
 * 4. Filter members with maximum comment karma boundary
 * 5. Verify all results stay within maximum comment karma limit
 * 6. Test range filtering with both min and max boundaries
 * 7. Validate pagination with comment karma filters
 * 8. Test sorting by comment_karma field
 * 9. Verify response structure and data integrity
 */
export async function test_api_karma_scores_administrator_filter_by_comment_karma(
  connection: api.IConnection,
) {
  // 1. Authenticate as administrator
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphabets(10);

  const administrator: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        username: RandomGenerator.alphabets(8),
        name: RandomGenerator.name(),
        href: "https://example.com",
        referrer: null,
        ip: null,
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(administrator);
  TestValidator.equals(
    "administrator authenticated",
    typeof administrator.id,
    "string",
  );

  // 2. Filter members with minimum comment karma threshold
  const minCommentKarma = 50;
  const resultWithMinFilter: IPageICommunityPlatformKarmaScore.ISummary =
    await api.functional.communityPlatform.administrator.karmaScores.index(
      connection,
      {
        body: {
          page: 1,
          limit: 20,
          minCommentKarma,
          orderBy: "comment_karma",
          order: "desc",
        } satisfies ICommunityPlatformKarmaScore.IRequest,
      },
    );
  typia.assert(resultWithMinFilter);

  // 3. Verify all results meet minimum comment karma requirement
  if (resultWithMinFilter.data.length > 0) {
    for (const karma of resultWithMinFilter.data) {
      TestValidator.predicate(
        "all results have comment_karma >= minCommentKarma",
        karma.comment_karma >= minCommentKarma,
      );
    }
  }

  // 4. Filter members with maximum comment karma boundary
  const maxCommentKarma = 200;
  const resultWithMaxFilter: IPageICommunityPlatformKarmaScore.ISummary =
    await api.functional.communityPlatform.administrator.karmaScores.index(
      connection,
      {
        body: {
          page: 1,
          limit: 20,
          maxCommentKarma,
          orderBy: "comment_karma",
          order: "asc",
        } satisfies ICommunityPlatformKarmaScore.IRequest,
      },
    );
  typia.assert(resultWithMaxFilter);

  // 5. Verify all results stay within maximum comment karma limit
  if (resultWithMaxFilter.data.length > 0) {
    for (const karma of resultWithMaxFilter.data) {
      TestValidator.predicate(
        "all results have comment_karma <= maxCommentKarma",
        karma.comment_karma <= maxCommentKarma,
      );
    }
  }

  // 6. Test range filtering with both min and max boundaries
  const minRange = 30;
  const maxRange = 150;
  const resultWithRangeFilter: IPageICommunityPlatformKarmaScore.ISummary =
    await api.functional.communityPlatform.administrator.karmaScores.index(
      connection,
      {
        body: {
          page: 1,
          limit: 20,
          minCommentKarma: minRange,
          maxCommentKarma: maxRange,
          orderBy: "comment_karma",
          order: "desc",
        } satisfies ICommunityPlatformKarmaScore.IRequest,
      },
    );
  typia.assert(resultWithRangeFilter);

  // Verify range boundaries
  if (resultWithRangeFilter.data.length > 0) {
    for (const karma of resultWithRangeFilter.data) {
      TestValidator.predicate(
        "all results fall within comment_karma range [minRange, maxRange]",
        karma.comment_karma >= minRange && karma.comment_karma <= maxRange,
      );
    }
  }

  // 7. Validate pagination with comment karma filters
  const paginatedResult: IPageICommunityPlatformKarmaScore.ISummary =
    await api.functional.communityPlatform.administrator.karmaScores.index(
      connection,
      {
        body: {
          page: 1,
          limit: 10,
          minCommentKarma: 20,
          orderBy: "comment_karma",
        } satisfies ICommunityPlatformKarmaScore.IRequest,
      },
    );
  typia.assert(paginatedResult);
  TestValidator.predicate(
    "pagination metadata exists",
    paginatedResult.pagination !== undefined &&
      paginatedResult.pagination.limit === 10,
  );

  // 8. Test sorting by comment_karma field
  const sortedByCommentKarmaDesc: IPageICommunityPlatformKarmaScore.ISummary =
    await api.functional.communityPlatform.administrator.karmaScores.index(
      connection,
      {
        body: {
          page: 1,
          limit: 20,
          orderBy: "comment_karma",
          order: "desc",
        } satisfies ICommunityPlatformKarmaScore.IRequest,
      },
    );
  typia.assert(sortedByCommentKarmaDesc);

  // Verify descending order
  if (sortedByCommentKarmaDesc.data.length > 1) {
    for (let i = 0; i < sortedByCommentKarmaDesc.data.length - 1; i++) {
      TestValidator.predicate(
        "comment_karma values sorted in descending order",
        sortedByCommentKarmaDesc.data[i].comment_karma >=
          sortedByCommentKarmaDesc.data[i + 1].comment_karma,
      );
    }
  }

  // 9. Verify response structure and data integrity
  if (resultWithMinFilter.data.length > 0) {
    const sample = resultWithMinFilter.data[0];
    TestValidator.predicate(
      "karma record has id",
      typeof sample.id === "string" && sample.id.length > 0,
    );
    TestValidator.predicate(
      "karma record has comment_karma",
      typeof sample.comment_karma === "number",
    );
    TestValidator.predicate(
      "karma record has post_karma",
      typeof sample.post_karma === "number",
    );
    TestValidator.predicate(
      "karma record has total_karma",
      typeof sample.total_karma === "number",
    );
    TestValidator.predicate(
      "karma record has updated_at",
      typeof sample.updated_at === "string",
    );
    TestValidator.predicate(
      "total_karma equals sum of post and comment karma",
      sample.total_karma === sample.post_karma + sample.comment_karma,
    );
  }
}
