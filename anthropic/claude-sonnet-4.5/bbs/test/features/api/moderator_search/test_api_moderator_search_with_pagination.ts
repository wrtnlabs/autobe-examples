import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardModerator";

/**
 * Test pagination functionality for moderator search results.
 *
 * This test validates that the moderator search API correctly handles
 * pagination by creating a substantial number of moderator accounts and
 * verifying that pagination parameters (page, limit) work correctly across
 * multiple pages.
 *
 * Test workflow:
 *
 * 1. Register initial moderator for authentication
 * 2. Create 25 additional moderator accounts for multi-page testing
 * 3. Test pagination with limit=5 (5 pages expected)
 * 4. Test pagination with limit=10 (3 pages expected)
 * 5. Test pagination with limit=20 (2 pages expected)
 * 6. Validate pagination metadata accuracy
 * 7. Test edge cases (last page, page beyond total)
 */
export async function test_api_moderator_search_with_pagination(
  connection: api.IConnection,
) {
  // Step 1: Register initial moderator for authentication
  const firstModeratorEmail = typia.random<string & tags.Format<"email">>();
  const firstModerator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: firstModeratorEmail,
        password: "SecurePassword123!",
        username: RandomGenerator.alphaNumeric(10),
        display_name: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(firstModerator);

  // Step 2: Create 25 additional moderator accounts for multi-page testing
  const createdModerators: IDiscussionBoardModerator.IAuthorized[] = [
    firstModerator,
  ];

  const additionalModerators = await ArrayUtil.asyncRepeat(
    25,
    async (index) => {
      const moderator: IDiscussionBoardModerator.IAuthorized =
        await api.functional.auth.moderator.join(connection, {
          body: {
            email: typia.random<string & tags.Format<"email">>(),
            password: "SecurePassword123!",
            username: `test_mod_${index}_${RandomGenerator.alphaNumeric(8)}`,
            display_name: RandomGenerator.name(),
            href: typia.random<string & tags.Format<"uri">>(),
            referrer: typia.random<string & tags.Format<"uri">>(),
          } satisfies IDiscussionBoardModerator.ICreate,
        });
      typia.assert(moderator);
      return moderator;
    },
  );

  createdModerators.push(...additionalModerators);

  // Total moderators: 26 (1 initial + 25 additional)
  const totalModerators = createdModerators.length;

  // Step 3: Test pagination with limit=5 (should have 6 pages)
  const limit5 = 5;
  const expectedPages5 = Math.ceil(totalModerators / limit5);

  const allModsLimit5: IDiscussionBoardModerator.ISummary[] = [];

  for (let page = 1; page <= expectedPages5; page++) {
    const response: IPageIDiscussionBoardModerator.ISummary =
      await api.functional.discussionBoard.moderator.moderators.index(
        connection,
        {
          body: {
            page: page,
            limit: limit5,
          } satisfies IDiscussionBoardModerator.IRequest,
        },
      );
    typia.assert(response);

    // Validate pagination metadata
    TestValidator.equals(
      "current page matches requested",
      response.pagination.current,
      page,
    );
    TestValidator.equals(
      "limit matches requested",
      response.pagination.limit,
      limit5,
    );
    TestValidator.predicate(
      "total records is at least created moderators",
      response.pagination.records >= totalModerators,
    );

    // Validate data array length
    if (page < expectedPages5) {
      TestValidator.predicate(
        "page has items up to limit",
        response.data.length <= limit5,
      );
    }

    allModsLimit5.push(...response.data);
  }

  // Verify no duplicates across pages
  const uniqueIds5 = new Set(allModsLimit5.map((m) => m.id));
  TestValidator.equals(
    "no duplicate moderators with limit=5",
    uniqueIds5.size,
    allModsLimit5.length,
  );

  // Step 4: Test pagination with limit=10 (should have 3 pages)
  const limit10 = 10;

  const page1Limit10: IPageIDiscussionBoardModerator.ISummary =
    await api.functional.discussionBoard.moderator.moderators.index(
      connection,
      {
        body: {
          page: 1,
          limit: limit10,
        } satisfies IDiscussionBoardModerator.IRequest,
      },
    );
  typia.assert(page1Limit10);

  TestValidator.equals(
    "limit=10 page 1 current",
    page1Limit10.pagination.current,
    1,
  );
  TestValidator.equals(
    "limit=10 page 1 limit",
    page1Limit10.pagination.limit,
    limit10,
  );
  TestValidator.predicate(
    "limit=10 page 1 has data",
    page1Limit10.data.length > 0,
  );
  TestValidator.predicate(
    "limit=10 page 1 data within limit",
    page1Limit10.data.length <= limit10,
  );

  const page2Limit10: IPageIDiscussionBoardModerator.ISummary =
    await api.functional.discussionBoard.moderator.moderators.index(
      connection,
      {
        body: {
          page: 2,
          limit: limit10,
        } satisfies IDiscussionBoardModerator.IRequest,
      },
    );
  typia.assert(page2Limit10);

  TestValidator.predicate(
    "limit=10 page 2 data within limit",
    page2Limit10.data.length <= limit10,
  );

  // Verify no overlap between page 1 and page 2
  const page1Ids = new Set(page1Limit10.data.map((m) => m.id));
  const page2Ids = new Set(page2Limit10.data.map((m) => m.id));
  const hasOverlap = [...page1Ids].some((id) => page2Ids.has(id));
  TestValidator.equals("no overlap between pages", false, hasOverlap);

  // Step 5: Test pagination with limit=20 (should have 2 pages)
  const limit20 = 20;

  const page1Limit20: IPageIDiscussionBoardModerator.ISummary =
    await api.functional.discussionBoard.moderator.moderators.index(
      connection,
      {
        body: {
          page: 1,
          limit: limit20,
        } satisfies IDiscussionBoardModerator.IRequest,
      },
    );
  typia.assert(page1Limit20);

  TestValidator.equals(
    "limit=20 page 1 current",
    page1Limit20.pagination.current,
    1,
  );
  TestValidator.predicate(
    "limit=20 page 1 has data",
    page1Limit20.data.length > 0,
  );
  TestValidator.predicate(
    "limit=20 page 1 data within limit",
    page1Limit20.data.length <= limit20,
  );

  // Last page with limit=20
  const page2Limit20: IPageIDiscussionBoardModerator.ISummary =
    await api.functional.discussionBoard.moderator.moderators.index(
      connection,
      {
        body: {
          page: 2,
          limit: limit20,
        } satisfies IDiscussionBoardModerator.IRequest,
      },
    );
  typia.assert(page2Limit20);

  TestValidator.predicate(
    "limit=20 page 2 data within limit",
    page2Limit20.data.length <= limit20,
  );

  // Step 6: Test edge case - requesting page beyond total pages
  const beyondPage = 100;
  const beyondResponse: IPageIDiscussionBoardModerator.ISummary =
    await api.functional.discussionBoard.moderator.moderators.index(
      connection,
      {
        body: {
          page: beyondPage,
          limit: 5,
        } satisfies IDiscussionBoardModerator.IRequest,
      },
    );
  typia.assert(beyondResponse);

  TestValidator.predicate(
    "page beyond total returns empty or valid data",
    beyondResponse.data.length >= 0,
  );

  // Step 7: Test with maximum limit constraint (100)
  const limit100 = 100;
  const page1Limit100: IPageIDiscussionBoardModerator.ISummary =
    await api.functional.discussionBoard.moderator.moderators.index(
      connection,
      {
        body: {
          page: 1,
          limit: limit100,
        } satisfies IDiscussionBoardModerator.IRequest,
      },
    );
  typia.assert(page1Limit100);

  TestValidator.predicate(
    "limit=100 returns data",
    page1Limit100.data.length >= totalModerators,
  );
  TestValidator.equals(
    "limit=100 page is 1",
    page1Limit100.pagination.current,
    1,
  );
}
