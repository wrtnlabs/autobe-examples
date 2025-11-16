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
 * Test sorting karma scores by comment_karma field.
 *
 * This scenario validates that administrators can identify members based on
 * their comment engagement and reputation. Test both descending order to find
 * top commenters and ascending order to find members with minimal comment
 * participation. Verify that sorting by comment karma provides accurate
 * insights into discussion participation patterns.
 *
 * Process:
 *
 * 1. Administrator authentication via join endpoint
 * 2. Retrieve karma scores sorted by comment_karma in descending order (top
 *    commenters)
 * 3. Verify results are properly ordered by comment_karma values
 * 4. Retrieve karma scores sorted by comment_karma in ascending order (minimal
 *    commenters)
 * 5. Verify results are properly ordered in reverse
 * 6. Validate pagination and data integrity
 */
export async function test_api_karma_scores_administrator_sort_by_comment_karma(
  connection: api.IConnection,
) {
  // 1. Authenticate as administrator
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminPassword: string = RandomGenerator.alphabets(8);

  const adminAuth: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        username: RandomGenerator.alphabets(10),
        name: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(adminAuth);

  // 2. Retrieve karma scores sorted by comment_karma in descending order
  const descendingResult: IPageICommunityPlatformKarmaScore.ISummary =
    await api.functional.communityPlatform.administrator.karmaScores.index(
      connection,
      {
        body: {
          orderBy: "comment_karma",
          order: "desc",
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformKarmaScore.IRequest,
      },
    );
  typia.assert(descendingResult);

  // 3. Validate descending order - comment_karma should be in descending sequence
  if (descendingResult.data.length > 1) {
    for (let i = 0; i < descendingResult.data.length - 1; i++) {
      TestValidator.predicate(
        "comment_karma values should be in descending order",
        descendingResult.data[i].comment_karma >=
          descendingResult.data[i + 1].comment_karma,
      );
    }
  }

  // 4. Retrieve karma scores sorted by comment_karma in ascending order
  const ascendingResult: IPageICommunityPlatformKarmaScore.ISummary =
    await api.functional.communityPlatform.administrator.karmaScores.index(
      connection,
      {
        body: {
          orderBy: "comment_karma",
          order: "asc",
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformKarmaScore.IRequest,
      },
    );
  typia.assert(ascendingResult);

  // 5. Validate ascending order - comment_karma should be in ascending sequence
  if (ascendingResult.data.length > 1) {
    for (let i = 0; i < ascendingResult.data.length - 1; i++) {
      TestValidator.predicate(
        "comment_karma values should be in ascending order",
        ascendingResult.data[i].comment_karma <=
          ascendingResult.data[i + 1].comment_karma,
      );
    }
  }

  // 6. Validate pagination metadata
  TestValidator.predicate(
    "pagination current page should be 1",
    descendingResult.pagination.current === 1,
  );
  TestValidator.predicate(
    "pagination limit should be 10",
    descendingResult.pagination.limit === 10,
  );
  TestValidator.predicate(
    "pagination records should be non-negative",
    descendingResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages should be non-negative",
    descendingResult.pagination.pages >= 0,
  );

  // 7. Validate data integrity - total_karma equals post_karma plus comment_karma
  for (const karmaScore of descendingResult.data) {
    TestValidator.predicate(
      "total_karma should equal sum of post_karma and comment_karma",
      karmaScore.total_karma ===
        karmaScore.post_karma + karmaScore.comment_karma,
    );
  }

  // 8. Test sorting with filtering by comment_karma range
  const filteredResult: IPageICommunityPlatformKarmaScore.ISummary =
    await api.functional.communityPlatform.administrator.karmaScores.index(
      connection,
      {
        body: {
          orderBy: "comment_karma",
          order: "desc",
          minCommentKarma: 0,
          maxCommentKarma: 1000,
          page: 1,
          limit: 20,
        } satisfies ICommunityPlatformKarmaScore.IRequest,
      },
    );
  typia.assert(filteredResult);

  // 9. Validate filtered results respect the comment_karma range
  for (const karmaScore of filteredResult.data) {
    TestValidator.predicate(
      "comment_karma should be within specified filter range",
      karmaScore.comment_karma >= 0 && karmaScore.comment_karma <= 1000,
    );
  }
}
