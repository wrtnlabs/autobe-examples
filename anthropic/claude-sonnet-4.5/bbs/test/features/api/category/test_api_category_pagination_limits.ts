import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticleCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleCategory";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardArticleCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticleCategory";

/**
 * Test category pagination with custom page sizes and multiple pages.
 *
 * This test validates the pagination functionality of the category listing API
 * by:
 *
 * 1. Creating 25 categories (exceeding the default page limit of 20)
 * 2. Testing default pagination behavior on first and second pages
 * 3. Validating custom page limits (5, 50, 100)
 * 4. Verifying pagination metadata accuracy (current page, total pages, total
 *    records)
 * 5. Ensuring maximum limit enforcement
 *
 * The test ensures that pagination controls work correctly across different
 * scenarios and that metadata accurately reflects the state of paginated data.
 */
export async function test_api_category_pagination_limits(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account for authentication
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "SecurePassword123!",
      username: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardModerator.ICreate,
  });
  typia.assert(moderator);

  // Step 2: Create 25 categories to test pagination (exceeds default limit of 20)
  const createdCategories = await ArrayUtil.asyncRepeat(25, async (index) => {
    const category =
      await api.functional.discussionBoard.moderator.categories.create(
        connection,
        {
          body: {
            name: `Category ${index + 1} ${RandomGenerator.alphabets(5)}`,
            slug: `category-${index + 1}-${RandomGenerator.alphabets(5)}`,
            description: RandomGenerator.paragraph({ sentences: 2 }),
            sort_order: index,
          } satisfies IDiscussionBoardArticleCategory.ICreate,
        },
      );
    typia.assert(category);
    return category;
  });

  // Step 3: Retrieve first page with default pagination (should be 20 items)
  const defaultFirstPage =
    await api.functional.discussionBoard.categories.index(connection, {
      body: {
        page: 1,
      } satisfies IDiscussionBoardArticleCategory.IRequest,
    });
  typia.assert(defaultFirstPage);

  TestValidator.equals(
    "default first page should have 20 items",
    defaultFirstPage.data.length,
    20,
  );
  TestValidator.equals(
    "default pagination current page should be 1",
    defaultFirstPage.pagination.current,
    1,
  );
  TestValidator.equals(
    "default pagination limit should be 20",
    defaultFirstPage.pagination.limit,
    20,
  );
  TestValidator.equals(
    "total records should be 25",
    defaultFirstPage.pagination.records,
    25,
  );
  TestValidator.equals(
    "total pages should be 2",
    defaultFirstPage.pagination.pages,
    2,
  );

  // Step 4: Retrieve second page (should have remaining 5 items)
  const defaultSecondPage =
    await api.functional.discussionBoard.categories.index(connection, {
      body: {
        page: 2,
      } satisfies IDiscussionBoardArticleCategory.IRequest,
    });
  typia.assert(defaultSecondPage);

  TestValidator.equals(
    "second page should have 5 items",
    defaultSecondPage.data.length,
    5,
  );
  TestValidator.equals(
    "second page current should be 2",
    defaultSecondPage.pagination.current,
    2,
  );
  TestValidator.equals(
    "second page total records should be 25",
    defaultSecondPage.pagination.records,
    25,
  );

  // Step 5: Test custom limit=5
  const customLimit5 = await api.functional.discussionBoard.categories.index(
    connection,
    {
      body: {
        page: 1,
        limit: 5,
      } satisfies IDiscussionBoardArticleCategory.IRequest,
    },
  );
  typia.assert(customLimit5);

  TestValidator.equals(
    "custom limit 5 should return 5 items",
    customLimit5.data.length,
    5,
  );
  TestValidator.equals(
    "custom limit 5 metadata should show limit 5",
    customLimit5.pagination.limit,
    5,
  );
  TestValidator.equals(
    "custom limit 5 should have 5 total pages",
    customLimit5.pagination.pages,
    5,
  );

  // Step 6: Test custom limit=50 (all records should fit in one page)
  const customLimit50 = await api.functional.discussionBoard.categories.index(
    connection,
    {
      body: {
        page: 1,
        limit: 50,
      } satisfies IDiscussionBoardArticleCategory.IRequest,
    },
  );
  typia.assert(customLimit50);

  TestValidator.equals(
    "custom limit 50 should return all 25 items",
    customLimit50.data.length,
    25,
  );
  TestValidator.equals(
    "custom limit 50 metadata should show limit 50",
    customLimit50.pagination.limit,
    50,
  );
  TestValidator.equals(
    "custom limit 50 should have 1 total page",
    customLimit50.pagination.pages,
    1,
  );

  // Step 7: Test maximum limit enforcement (100)
  const maxLimit = await api.functional.discussionBoard.categories.index(
    connection,
    {
      body: {
        page: 1,
        limit: 100,
      } satisfies IDiscussionBoardArticleCategory.IRequest,
    },
  );
  typia.assert(maxLimit);

  TestValidator.equals(
    "max limit 100 should return all 25 items",
    maxLimit.data.length,
    25,
  );
  TestValidator.equals(
    "max limit 100 metadata should show limit 100",
    maxLimit.pagination.limit,
    100,
  );
  TestValidator.predicate(
    "limit should be within maximum allowed",
    maxLimit.pagination.limit <= 100,
  );
}
