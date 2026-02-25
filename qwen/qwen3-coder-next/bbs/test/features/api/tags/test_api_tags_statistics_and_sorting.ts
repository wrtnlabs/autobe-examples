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

export async function test_api_tags_statistics_and_sorting(
  connection: api.IConnection,
): Promise<void> {
  // Test the tags endpoint with various parameters to verify statistics and sorting
  // Test 1: Basic request with pagination
  const response1 = await api.functional.discussionBoard.tags.index(
    connection,
    {
      body: {
        page: 1,
        limit: 20,
      },
    },
  );
  typia.assert(response1);
  // Verify pagination structure exists and is valid
  TestValidator.predicate("pagination exists", response1.pagination !== null);
  TestValidator.predicate(
    "pagination records >= 0",
    response1.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages >= 0",
    response1.pagination.pages >= 0,
  );
  TestValidator.equals("pagination limit = 20", response1.pagination.limit, 20);
  TestValidator.equals(
    "pagination current = 1",
    response1.pagination.current,
    1,
  );
  // Test 2: Verify tag summary structure when data exists
  if (response1.data.length > 0) {
    // Check first tag has required fields
    TestValidator.predicate(
      "tag has uuid id",
      /^[0-9a-f-]{36}$/i.test(response1.data[0].id),
    );
    TestValidator.predicate(
      "tag has non-empty name",
      response1.data[0].tag_name.length > 0,
    );
    TestValidator.predicate(
      "tag has date-time format",
      new Date(response1.data[0].created_at).toISOString() ===
        response1.data[0].created_at,
    );
  }
  // Test 3: Request with search parameter
  const response2 = await api.functional.discussionBoard.tags.index(
    connection,
    {
      body: {
        search: "",
        page: 1,
        limit: 10,
      },
    },
  );
  typia.assert(response2);
  // Test 4: Request with different pagination
  const response3 = await api.functional.discussionBoard.tags.index(
    connection,
    {
      body: {
        page: 1,
        limit: 5,
      },
    },
  );
  typia.assert(response3);
  TestValidator.equals("pagination limit = 5", response3.pagination.limit, 5);
  // Test 5: Test with larger page size
  const response4 = await api.functional.discussionBoard.tags.index(
    connection,
    {
      body: {
        page: 1,
        limit: 50,
      },
    },
  );
  typia.assert(response4);
  TestValidator.equals("pagination limit = 50", response4.pagination.limit, 50);
  // Test 6: Verify pages calculation
  if (response4.pagination.records > 0) {
    const expectedPages = Math.ceil(
      response4.pagination.records / response4.pagination.limit,
    );
    TestValidator.equals(
      "pages calculation correct",
      response4.pagination.pages,
      expectedPages,
    );
  }
  // Test 7: Empty search should return same as no search
  const response5 = await api.functional.discussionBoard.tags.index(
    connection,
    {
      body: {
        search: "",
      },
    },
  );
  typia.assert(response5);
}
