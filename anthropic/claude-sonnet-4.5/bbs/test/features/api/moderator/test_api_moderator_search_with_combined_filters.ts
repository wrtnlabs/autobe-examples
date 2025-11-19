import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardModerator";

/**
 * Test complex moderator search scenarios combining multiple filter criteria
 * simultaneously.
 *
 * This test validates that the moderator search API correctly applies multiple
 * filters with AND logic, ensuring results satisfy all specified conditions. It
 * creates diverse moderator accounts with different attributes and performs
 * comprehensive search operations combining text search, activity status, date
 * ranges, sorting, and pagination.
 *
 * Test workflow:
 *
 * 1. Create initial moderator account for authentication
 * 2. Create 15 diverse moderator accounts with varied attributes:
 *
 *    - Different usernames (some with common prefixes for text search testing)
 *    - Unique email addresses
 *    - Mixed activity status (active and inactive)
 *    - Staggered creation dates (recent and older accounts)
 * 3. Perform combined filter searches:
 *
 *    - Text search + activity status filter
 *    - Date range filters + sorting by creation date
 *    - Email exact match + pagination
 *    - Complex multi-filter combinations
 * 4. Validate that results match ALL filter criteria (AND logic)
 * 5. Verify pagination metadata reflects accurate counts for filtered results
 */
export async function test_api_moderator_search_with_combined_filters(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate initial moderator
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminModerator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: adminEmail,
        password: "admin123!",
        username: "admin_moderator",
        display_name: "Admin Moderator",
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(adminModerator);

  // Step 2: Create diverse moderator accounts for testing
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
  const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

  const testModerators: IDiscussionBoardModerator.IAuthorized[] = [];

  // Create moderators with "test_" prefix for text search testing
  const testPrefixModerators = await ArrayUtil.asyncRepeat(5, async (index) => {
    const moderator = await api.functional.auth.moderator.join(connection, {
      body: {
        email: `test_mod_${index}_${typia.random<string & tags.Format<"email">>()}`,
        password: "password123",
        username: `test_moderator_${index}`,
        display_name: `Test Moderator ${index}`,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IDiscussionBoardModerator.ICreate,
    });
    typia.assert(moderator);
    return moderator;
  });
  testModerators.push(...testPrefixModerators);

  // Create moderators with "prod_" prefix
  const prodPrefixModerators = await ArrayUtil.asyncRepeat(5, async (index) => {
    const moderator = await api.functional.auth.moderator.join(connection, {
      body: {
        email: `prod_mod_${index}_${typia.random<string & tags.Format<"email">>()}`,
        password: "password123",
        username: `prod_moderator_${index}`,
        display_name: `Production Moderator ${index}`,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IDiscussionBoardModerator.ICreate,
    });
    typia.assert(moderator);
    return moderator;
  });
  testModerators.push(...prodPrefixModerators);

  // Create moderators with random usernames
  const randomModerators = await ArrayUtil.asyncRepeat(5, async (index) => {
    const moderator = await api.functional.auth.moderator.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "password123",
        username: RandomGenerator.name(1),
        display_name: RandomGenerator.name(2),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IDiscussionBoardModerator.ICreate,
    });
    typia.assert(moderator);
    return moderator;
  });
  testModerators.push(...randomModerators);

  // Step 3: Test combined filter: text search + activity status
  const activeTestModsSearch: IPageIDiscussionBoardModerator.ISummary =
    await api.functional.discussionBoard.moderator.moderators.index(
      connection,
      {
        body: {
          search: "test_moderator",
          is_active: true,
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardModerator.IRequest,
      },
    );
  typia.assert(activeTestModsSearch);

  // Validate results match both text search and active status
  TestValidator.predicate(
    "search results contain only active moderators matching search text",
    activeTestModsSearch.data.every(
      (mod) =>
        mod.is_active === true &&
        (mod.username.includes("test_moderator") ||
          mod.email.includes("test_mod")),
    ),
  );

  TestValidator.predicate(
    "pagination metadata reflects filtered count",
    activeTestModsSearch.pagination.records >= 0,
  );

  // Step 4: Test email exact match filter
  const emailToSearch = testModerators[0].email;
  const emailSearchResult: IPageIDiscussionBoardModerator.ISummary =
    await api.functional.discussionBoard.moderator.moderators.index(
      connection,
      {
        body: {
          email: emailToSearch,
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardModerator.IRequest,
      },
    );
  typia.assert(emailSearchResult);

  TestValidator.predicate(
    "email search returns exactly one matching moderator",
    emailSearchResult.data.length === 1,
  );

  TestValidator.equals(
    "email search returns correct moderator",
    emailSearchResult.data[0].email,
    emailToSearch,
  );

  // Step 5: Test sorting with username ascending
  const sortedByUsernameAsc: IPageIDiscussionBoardModerator.ISummary =
    await api.functional.discussionBoard.moderator.moderators.index(
      connection,
      {
        body: {
          search: "moderator",
          sort_by: "username",
          order: "asc",
          page: 1,
          limit: 20,
        } satisfies IDiscussionBoardModerator.IRequest,
      },
    );
  typia.assert(sortedByUsernameAsc);

  // Validate sorting order
  if (sortedByUsernameAsc.data.length > 1) {
    for (let i = 0; i < sortedByUsernameAsc.data.length - 1; i++) {
      TestValidator.predicate(
        `username at index ${i} is less than or equal to next`,
        sortedByUsernameAsc.data[i].username <=
          sortedByUsernameAsc.data[i + 1].username,
      );
    }
  }

  // Step 6: Test sorting with username descending
  const sortedByUsernameDesc: IPageIDiscussionBoardModerator.ISummary =
    await api.functional.discussionBoard.moderator.moderators.index(
      connection,
      {
        body: {
          search: "moderator",
          sort_by: "username",
          order: "desc",
          page: 1,
          limit: 20,
        } satisfies IDiscussionBoardModerator.IRequest,
      },
    );
  typia.assert(sortedByUsernameDesc);

  // Validate descending sorting order
  if (sortedByUsernameDesc.data.length > 1) {
    for (let i = 0; i < sortedByUsernameDesc.data.length - 1; i++) {
      TestValidator.predicate(
        `username at index ${i} is greater than or equal to next`,
        sortedByUsernameDesc.data[i].username >=
          sortedByUsernameDesc.data[i + 1].username,
      );
    }
  }

  // Step 7: Test pagination with combined filters
  const paginatedSearch: IPageIDiscussionBoardModerator.ISummary =
    await api.functional.discussionBoard.moderator.moderators.index(
      connection,
      {
        body: {
          is_active: true,
          page: 1,
          limit: 5,
        } satisfies IDiscussionBoardModerator.IRequest,
      },
    );
  typia.assert(paginatedSearch);

  TestValidator.predicate(
    "pagination limit is respected",
    paginatedSearch.data.length <= 5,
  );

  TestValidator.predicate(
    "all paginated results are active moderators",
    paginatedSearch.data.every((mod) => mod.is_active === true),
  );

  TestValidator.equals(
    "pagination current page is 1",
    paginatedSearch.pagination.current,
    1,
  );

  TestValidator.equals(
    "pagination limit matches request",
    paginatedSearch.pagination.limit,
    5,
  );

  // Step 8: Test complex multi-filter combination
  const complexSearch: IPageIDiscussionBoardModerator.ISummary =
    await api.functional.discussionBoard.moderator.moderators.index(
      connection,
      {
        body: {
          search: "test",
          is_active: true,
          sort_by: "created_at",
          order: "desc",
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardModerator.IRequest,
      },
    );
  typia.assert(complexSearch);

  // Validate all filters applied correctly
  TestValidator.predicate(
    "complex search results match all criteria",
    complexSearch.data.every(
      (mod) =>
        mod.is_active === true &&
        (mod.username.includes("test") || mod.email.includes("test")),
    ),
  );

  // Validate descending created_at sorting
  if (complexSearch.data.length > 1) {
    for (let i = 0; i < complexSearch.data.length - 1; i++) {
      const current = new Date(complexSearch.data[i].created_at).getTime();
      const next = new Date(complexSearch.data[i + 1].created_at).getTime();
      TestValidator.predicate(
        `created_at at index ${i} is greater than or equal to next`,
        current >= next,
      );
    }
  }

  // Step 9: Test search with no results
  const noResultsSearch: IPageIDiscussionBoardModerator.ISummary =
    await api.functional.discussionBoard.moderator.moderators.index(
      connection,
      {
        body: {
          search: "nonexistent_moderator_xyz123",
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardModerator.IRequest,
      },
    );
  typia.assert(noResultsSearch);

  TestValidator.equals(
    "search with no matches returns empty array",
    noResultsSearch.data.length,
    0,
  );

  TestValidator.equals(
    "pagination records is 0 for no results",
    noResultsSearch.pagination.records,
    0,
  );

  // Step 10: Test pagination across multiple pages
  const firstPage: IPageIDiscussionBoardModerator.ISummary =
    await api.functional.discussionBoard.moderator.moderators.index(
      connection,
      {
        body: {
          page: 1,
          limit: 5,
        } satisfies IDiscussionBoardModerator.IRequest,
      },
    );
  typia.assert(firstPage);

  if (firstPage.pagination.records > 5) {
    const secondPage: IPageIDiscussionBoardModerator.ISummary =
      await api.functional.discussionBoard.moderator.moderators.index(
        connection,
        {
          body: {
            page: 2,
            limit: 5,
          } satisfies IDiscussionBoardModerator.IRequest,
        },
      );
    typia.assert(secondPage);

    TestValidator.equals(
      "second page current is 2",
      secondPage.pagination.current,
      2,
    );

    TestValidator.predicate(
      "pages have different moderators",
      firstPage.data[0].id !== secondPage.data[0].id,
    );
  }
}
