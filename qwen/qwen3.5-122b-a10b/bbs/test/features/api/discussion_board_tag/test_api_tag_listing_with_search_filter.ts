import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardTag";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_tag_listing_with_search_filter(
  connection: api.IConnection,
): Promise<void> {
  // Create guest connection for accessing public tag listing endpoint
  const guestConnection: api.IConnection = { host: connection.host };
  // Test 1: Search for existing tag names
  const existingKeyword = "script"; // Should match tags containing "script"
  // Search with existing keyword
  const existingSearchResult = await api.functional.discussionBoard.tags.index(
    guestConnection,
    {
      body: {
        search: existingKeyword,
        page: 1,
        limit: 10,
      } satisfies IDiscussionBoardTag.IRequest,
    },
  );
  typia.assert(existingSearchResult);
  // Verify pagination reflects filtered count
  TestValidator.predicate(
    "pagination records match filtered results",
    existingSearchResult.pagination.records ===
      existingSearchResult.data.length,
  );
  // Verify all returned tags contain the search keyword (case-insensitive)
  for (const tag of existingSearchResult.data) {
    TestValidator.predicate(
      `tag name contains keyword "${existingKeyword}"`,
      tag.name.toLowerCase().includes(existingKeyword.toLowerCase()),
    );
  }
  // Test 2: Search for non-existent tag name
  const nonExistentKeyword = "xyznonexistent123";
  const nonExistentSearchResult =
    await api.functional.discussionBoard.tags.index(guestConnection, {
      body: {
        search: nonExistentKeyword,
        page: 1,
        limit: 10,
      } satisfies IDiscussionBoardTag.IRequest,
    });
  typia.assert(nonExistentSearchResult);
  // Verify empty results for non-existent keyword
  TestValidator.equals(
    "non-existent search returns empty data array",
    nonExistentSearchResult.data.length,
    0,
  );
  TestValidator.equals(
    "non-existent search pagination records is 0",
    nonExistentSearchResult.pagination.records,
    0,
  );
  // Test 3: Case-insensitive matching
  const mixedCaseKeyword = "ReAcT";
  const mixedCaseSearchResult = await api.functional.discussionBoard.tags.index(
    guestConnection,
    {
      body: {
        search: mixedCaseKeyword,
        page: 1,
        limit: 10,
      } satisfies IDiscussionBoardTag.IRequest,
    },
  );
  typia.assert(mixedCaseSearchResult);
  // Verify case-insensitive matching works
  for (const tag of mixedCaseSearchResult.data) {
    TestValidator.predicate(
      `tag name matches case-insensitively for keyword "${mixedCaseKeyword}"`,
      tag.name.toLowerCase().includes(mixedCaseKeyword.toLowerCase()),
    );
  }
  // Test 4: Verify pagination metadata structure
  TestValidator.predicate(
    "pagination current page is 1",
    mixedCaseSearchResult.pagination.current === 1,
  );
  TestValidator.predicate(
    "pagination limit is within bounds",
    mixedCaseSearchResult.pagination.limit > 0 &&
      mixedCaseSearchResult.pagination.limit <= 100,
  );
  TestValidator.predicate(
    "pagination pages calculated correctly",
    mixedCaseSearchResult.pagination.pages ===
      Math.ceil(
        mixedCaseSearchResult.pagination.records /
          mixedCaseSearchResult.pagination.limit,
      ),
  );
  // Test 5: Search with different sort options
  const sortedByNameResult = await api.functional.discussionBoard.tags.index(
    guestConnection,
    {
      body: {
        search: "a",
        page: 1,
        limit: 5,
        sort_by: "name",
        sort_order: "asc",
      } satisfies IDiscussionBoardTag.IRequest,
    },
  );
  typia.assert(sortedByNameResult);
  // Verify results are sorted by name ascending
  for (let i = 1; i < sortedByNameResult.data.length; i++) {
    TestValidator.predicate(
      `tags sorted ascending by name at index ${i}`,
      sortedByNameResult.data[i - 1].name <= sortedByNameResult.data[i].name,
    );
  }
  // Test 6: Search with date range filter
  const now = new Date();
  const createdAtFrom = new Date(now.getTime() - 1000 * 60 * 60 * 24 * 30); // 30 days ago
  const dateFilteredResult = await api.functional.discussionBoard.tags.index(
    guestConnection,
    {
      body: {
        search: undefined,
        page: 1,
        limit: 10,
        created_at_from: createdAtFrom.toISOString(),
      } satisfies IDiscussionBoardTag.IRequest,
    },
  );
  typia.assert(dateFilteredResult);
  // Verify all tags in result were created after the filter date
  for (const tag of dateFilteredResult.data) {
    TestValidator.predicate(
      `tag created_at is after filter date`,
      new Date(tag.created_at).getTime() >= createdAtFrom.getTime(),
    );
  }
}
