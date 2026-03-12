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

/**
 * Test retrieving a paginated list of all active tags from the discussion board platform.
 * 1. Request tags with default pagination parameters
 * 2. Validate response structure with pagination metadata
 * 3. Verify tag summaries contain required fields (id, name, created_at, updated_at, deleted_at)
 * 4. Confirm soft-deleted tags are excluded by default
 * 5. Test pagination navigation with custom page and limit values
 * 6. Verify sorting by created_at in descending order (default)
 */
export async function test_api_tag_list_with_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Request tags with default pagination (page=1, limit=20)
  const defaultResponse = await api.functional.discussionBoard.tags.index(
    connection,
    {
      body: {} satisfies IDiscussionBoardTag.IRequest,
    },
  );
  typia.assert(defaultResponse);
  // 2. Validate pagination metadata structure
  TestValidator.equals(
    "has pagination object",
    defaultResponse.pagination !== undefined,
    true,
  );
  TestValidator.predicate(
    "current page is 1",
    defaultResponse.pagination.current === 1,
  );
  TestValidator.predicate(
    "limit is positive",
    defaultResponse.pagination.limit > 0,
  );
  TestValidator.predicate(
    "records count is non-negative",
    defaultResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages count is non-negative",
    defaultResponse.pagination.pages >= 0,
  );
  // 3. Validate tag summary structure for each tag
  await ArrayUtil.asyncForEach(defaultResponse.data, async (tag, index) => {
    typia.assert(tag);
    TestValidator.predicate(
      `tag ${index} has valid UUID`,
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        tag.id,
      ),
    );
    TestValidator.predicate(
      `tag ${index} has non-empty name`,
      tag.name.length > 0,
    );
    TestValidator.predicate(
      `tag ${index} has valid created_at`,
      /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}/.test(
        tag.created_at,
      ),
    );
    TestValidator.predicate(
      `tag ${index} has valid updated_at`,
      /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}/.test(
        tag.updated_at,
      ),
    );
    TestValidator.predicate(
      `tag ${index} deleted_at is null (active tag)`,
      tag.deleted_at === null,
    );
  });
  // 4. Test pagination with custom page and limit
  const paginatedResponse = await api.functional.discussionBoard.tags.index(
    connection,
    {
      body: {
        page: 2,
        limit: 10,
      } satisfies IDiscussionBoardTag.IRequest,
    },
  );
  typia.assert(paginatedResponse);
  TestValidator.equals(
    "current page is 2",
    paginatedResponse.pagination.current,
    2,
  );
  TestValidator.equals("limit is 10", paginatedResponse.pagination.limit, 10);
  TestValidator.predicate(
    "data length does not exceed limit",
    paginatedResponse.data.length <= 10,
  );
  // 5. Test sorting by name in ascending order
  const sortedByNameResponse = await api.functional.discussionBoard.tags.index(
    connection,
    {
      body: {
        sortBy: "name",
        sortOrder: "asc",
        limit: 5,
      } satisfies IDiscussionBoardTag.IRequest,
    },
  );
  typia.assert(sortedByNameResponse);
  // Verify ascending order by name
  for (let i = 1; i < sortedByNameResponse.data.length; i++) {
    TestValidator.predicate(
      `tag ${i - 1} name <= tag ${i} name (ascending)`,
      sortedByNameResponse.data[i - 1].name.localeCompare(
        sortedByNameResponse.data[i].name,
      ) <= 0,
    );
  }
  // 6. Test sorting by created_at in descending order
  const sortedByDateResponse = await api.functional.discussionBoard.tags.index(
    connection,
    {
      body: {
        sortBy: "created_at",
        sortOrder: "desc",
        limit: 5,
      } satisfies IDiscussionBoardTag.IRequest,
    },
  );
  typia.assert(sortedByDateResponse);
  // Verify descending order by created_at
  for (let i = 1; i < sortedByDateResponse.data.length; i++) {
    TestValidator.predicate(
      `tag ${i - 1} created_at >= tag ${i} created_at (descending)`,
      new Date(sortedByDateResponse.data[i - 1].created_at).getTime() >=
        new Date(sortedByDateResponse.data[i].created_at).getTime(),
    );
  }
  // 7. Test search functionality with partial name matching
  const searchQuery = RandomGenerator.alphabets(3);
  const searchResponse = await api.functional.discussionBoard.tags.index(
    connection,
    {
      body: {
        search: searchQuery,
        limit: 5,
      } satisfies IDiscussionBoardTag.IRequest,
    },
  );
  typia.assert(searchResponse);
  // Verify all returned tags contain the search query in their name
  await ArrayUtil.asyncForEach(searchResponse.data, async (tag) => {
    TestValidator.predicate(
      `tag name contains search query "${searchQuery}"`,
      tag.name.toLowerCase().includes(searchQuery.toLowerCase()),
    );
  });
  // 8. Test excludeUnused filter
  const excludeUnusedResponse = await api.functional.discussionBoard.tags.index(
    connection,
    {
      body: {
        excludeUnused: true,
        limit: 10,
      } satisfies IDiscussionBoardTag.IRequest,
    },
  );
  typia.assert(excludeUnusedResponse);
  TestValidator.predicate(
    "excludeUnused returns valid response",
    excludeUnusedResponse.data.length >= 0,
  );
  // 9. Test createdAfter date filter
  const oneMonthAgo = new Date();
  oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
  const createdAfterResponse = await api.functional.discussionBoard.tags.index(
    connection,
    {
      body: {
        createdAfter: oneMonthAgo.toISOString(),
        limit: 10,
      } satisfies IDiscussionBoardTag.IRequest,
    },
  );
  typia.assert(createdAfterResponse);
  // Verify all returned tags were created after the specified date
  await ArrayUtil.asyncForEach(createdAfterResponse.data, async (tag) => {
    TestValidator.predicate(
      `tag created_at is after filter date`,
      new Date(tag.created_at).getTime() >= oneMonthAgo.getTime(),
    );
  });
  // 10. Test createdBefore date filter
  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
  const createdBeforeResponse = await api.functional.discussionBoard.tags.index(
    connection,
    {
      body: {
        createdBefore: oneYearAgo.toISOString(),
        limit: 10,
      } satisfies IDiscussionBoardTag.IRequest,
    },
  );
  typia.assert(createdBeforeResponse);
  // Verify all returned tags were created before the specified date
  await ArrayUtil.asyncForEach(createdBeforeResponse.data, async (tag) => {
    TestValidator.predicate(
      `tag created_at is before filter date`,
      new Date(tag.created_at).getTime() <= oneYearAgo.getTime(),
    );
  });
}
