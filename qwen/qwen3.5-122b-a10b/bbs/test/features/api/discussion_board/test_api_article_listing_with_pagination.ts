import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticle";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_article_listing_with_pagination(
  connection: api.IConnection,
): Promise<void> {
  // Test 1: Basic pagination with default parameters
  const basicResult = await api.functional.discussionBoard.articles.index(
    connection,
    {
      body: {
        page: 1,
        limit: 10,
      } satisfies IDiscussionBoardArticle.IRequest,
    },
  );
  typia.assert(basicResult);
  // Validate pagination metadata exists and is correct
  TestValidator.equals("current page is 1", basicResult.pagination.current, 1);
  TestValidator.equals("limit is 10", basicResult.pagination.limit, 10);
  TestValidator.predicate(
    "total records is non-negative",
    basicResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "total pages is non-negative",
    basicResult.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "pages calculation is correct",
    basicResult.pagination.pages ===
      Math.ceil(
        basicResult.pagination.records / basicResult.pagination.limit,
      ) || basicResult.pagination.records === 0,
  );
  // Test 2: Article summary structure validation
  if (basicResult.data.length > 0) {
    const firstArticle = basicResult.data[0];
    typia.assert(firstArticle);
    // Validate article summary fields
    TestValidator.predicate(
      "has valid UUID",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        firstArticle.id,
      ),
    );
    TestValidator.predicate("has title", firstArticle.title.length > 0);
    TestValidator.predicate(
      "has section info",
      firstArticle.section !== null && firstArticle.section !== undefined,
    );
    TestValidator.predicate(
      "has author info",
      firstArticle.author !== null && firstArticle.author !== undefined,
    );
    TestValidator.predicate(
      "has created_at timestamp",
      firstArticle.created_at !== null && firstArticle.created_at !== undefined,
    );
    TestValidator.predicate(
      "has updated_at timestamp",
      firstArticle.updated_at !== null && firstArticle.updated_at !== undefined,
    );
    TestValidator.predicate(
      "comments_count is non-negative",
      firstArticle.comments_count >= 0,
    );
    // Validate section summary structure
    if (firstArticle.section) {
      typia.assert(firstArticle.section);
      TestValidator.predicate(
        "section has valid UUID",
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          firstArticle.section.id,
        ),
      );
      TestValidator.predicate(
        "section has name",
        firstArticle.section.name.length > 0,
      );
      TestValidator.predicate(
        "section has creator",
        firstArticle.section.creator !== null &&
          firstArticle.section.creator !== undefined,
      );
    }
    // Validate author (member) summary structure
    if (firstArticle.author) {
      typia.assert(firstArticle.author);
      TestValidator.predicate(
        "author has valid UUID",
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          firstArticle.author.id,
        ),
      );
      TestValidator.predicate(
        "author has display_name",
        firstArticle.author.display_name.length > 0,
      );
      TestValidator.predicate(
        "author has ban_status",
        firstArticle.author.ban_status !== null &&
          firstArticle.author.ban_status !== undefined,
      );
    }
  }
  // Test 3: Sorting by creation date descending (default behavior)
  const sortedResult = await api.functional.discussionBoard.articles.index(
    connection,
    {
      body: {
        page: 1,
        limit: 20,
        sortBy: "created_at",
        sortOrder: "desc",
      } satisfies IDiscussionBoardArticle.IRequest,
    },
  );
  typia.assert(sortedResult);
  // Verify descending order - each article should be older or equal to the previous one
  for (let i = 1; i < sortedResult.data.length; i++) {
    TestValidator.predicate(
      `article ${i - 1} is newer than or equal to article ${i}`,
      sortedResult.data[i - 1].created_at >= sortedResult.data[i].created_at,
    );
  }
  // Test 4: Pagination across multiple pages
  const page2Result = await api.functional.discussionBoard.articles.index(
    connection,
    {
      body: {
        page: 2,
        limit: 10,
      } satisfies IDiscussionBoardArticle.IRequest,
    },
  );
  typia.assert(page2Result);
  TestValidator.equals("current page is 2", page2Result.pagination.current, 2);
  TestValidator.equals("limit is 10", page2Result.pagination.limit, 10);
  // Test 5: Search functionality with keyword
  const searchResult = await api.functional.discussionBoard.articles.index(
    connection,
    {
      body: {
        page: 1,
        limit: 10,
        search: "test",
      } satisfies IDiscussionBoardArticle.IRequest,
    },
  );
  typia.assert(searchResult);
  TestValidator.predicate(
    "search returns valid pagination",
    searchResult.pagination.current === 1,
  );
  // Test 6: Limit boundary testing (max 100)
  const maxLimitResult = await api.functional.discussionBoard.articles.index(
    connection,
    {
      body: {
        page: 1,
        limit: 100,
      } satisfies IDiscussionBoardArticle.IRequest,
    },
  );
  typia.assert(maxLimitResult);
  TestValidator.predicate(
    "limit respects maximum of 100",
    maxLimitResult.pagination.limit <= 100,
  );
  // Test 7: Sorting by title ascending
  const titleSortResult = await api.functional.discussionBoard.articles.index(
    connection,
    {
      body: {
        page: 1,
        limit: 20,
        sortBy: "title",
        sortOrder: "asc",
      } satisfies IDiscussionBoardArticle.IRequest,
    },
  );
  typia.assert(titleSortResult);
  // Verify ascending order by title
  for (let i = 1; i < titleSortResult.data.length; i++) {
    TestValidator.predicate(
      `article ${i - 1} title comes before or equals article ${i}`,
      titleSortResult.data[i - 1].title <= titleSortResult.data[i].title,
    );
  }
  // Test 8: Verify pagination calculation accuracy
  const smallLimitResult = await api.functional.discussionBoard.articles.index(
    connection,
    {
      body: {
        page: 1,
        limit: 5,
      } satisfies IDiscussionBoardArticle.IRequest,
    },
  );
  typia.assert(smallLimitResult);
  // Total records should be consistent across different page sizes
  TestValidator.equals(
    "total records consistent",
    smallLimitResult.pagination.records,
    basicResult.pagination.records,
  );
}
