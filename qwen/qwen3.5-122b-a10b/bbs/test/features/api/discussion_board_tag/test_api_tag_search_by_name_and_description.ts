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

export async function test_api_tag_search_by_name_and_description(
  connection: api.IConnection,
): Promise<void> {
  // Test 1: Empty search parameters should return all active tags
  const allTags = await api.functional.discussionBoard.tags.index(connection, {
    body: {} satisfies IDiscussionBoardTag.IRequest,
  });
  typia.assert(allTags);
  TestValidator.predicate(
    "empty search returns paginated response",
    allTags.data.length >= 0 &&
      allTags.pagination.records >= allTags.data.length,
  );
  // Test 2: Verify all returned tags are not soft-deleted
  for (const tag of allTags.data) {
    TestValidator.predicate(
      `tag ${tag.id} is not soft-deleted`,
      tag.deleted_at === null || tag.deleted_at === undefined,
    );
  }
  // Test 3: Search by name pattern
  if (allTags.data.length > 0) {
    // Extract a substring from an existing tag name for partial matching
    const sampleTag = allTags.data[0];
    const nameSubstring = sampleTag.name.substring(
      0,
      Math.max(2, Math.floor(sampleTag.name.length / 2)),
    );
    const nameSearchResult = await api.functional.discussionBoard.tags.index(
      connection,
      {
        body: { name: nameSubstring } satisfies IDiscussionBoardTag.IRequest,
      },
    );
    typia.assert(nameSearchResult);
    // All returned tags should have the search term in their name (case-insensitive)
    for (const tag of nameSearchResult.data) {
      TestValidator.predicate(
        `tag name contains "${nameSubstring}"`,
        tag.name.toLowerCase().includes(nameSubstring.toLowerCase()),
      );
    }
  }
  // Test 4: Combined search with both name and description
  if (allTags.data.length > 0) {
    const sampleTag = allTags.data[0];
    const namePart = sampleTag.name.substring(
      0,
      Math.max(2, Math.floor(sampleTag.name.length / 2)),
    );
    const combinedSearchResult =
      await api.functional.discussionBoard.tags.index(connection, {
        body: {
          name: namePart,
          description: "",
        } satisfies IDiscussionBoardTag.IRequest,
      });
    typia.assert(combinedSearchResult);
    // Results should satisfy name condition
    for (const tag of combinedSearchResult.data) {
      TestValidator.predicate(
        `combined search - name matches "${namePart}"`,
        tag.name.toLowerCase().includes(namePart.toLowerCase()),
      );
    }
  }
  // Test 5: Search with no matching results
  const noMatchResult = await api.functional.discussionBoard.tags.index(
    connection,
    {
      body: {
        name: "zzz_nonexistent_tag_pattern_xyz",
      } satisfies IDiscussionBoardTag.IRequest,
    },
  );
  typia.assert(noMatchResult);
  TestValidator.equals(
    "no match returns empty data",
    noMatchResult.data.length,
    0,
  );
  TestValidator.predicate(
    "pagination metadata present",
    noMatchResult.pagination.current >= 1 &&
      noMatchResult.pagination.limit >= 0 &&
      noMatchResult.pagination.records >= 0,
  );
  // Test 6: Verify pagination parameters work correctly
  const paginatedResult = await api.functional.discussionBoard.tags.index(
    connection,
    {
      body: {
        page: 1,
        limit: 5,
      } satisfies IDiscussionBoardTag.IRequest,
    },
  );
  typia.assert(paginatedResult);
  TestValidator.predicate("limit respected", paginatedResult.data.length <= 5);
  TestValidator.equals(
    "page 1 returned",
    paginatedResult.pagination.current,
    1,
  );
  TestValidator.predicate(
    "pagination consistent",
    paginatedResult.pagination.pages >= 0 &&
      paginatedResult.pagination.records >= paginatedResult.data.length,
  );
}
