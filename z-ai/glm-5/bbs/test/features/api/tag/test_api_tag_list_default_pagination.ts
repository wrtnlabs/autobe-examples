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
 * Test the tag listing endpoint with default pagination parameters.
 *
 * Verifies that:
 * - Default pagination is page=1, limit=20
 * - Pagination metadata is correctly calculated
 * - Tags are returned in alphabetical order by name
 * - Response structure matches IDiscussionBoardTag.ISummary
 */
export async function test_api_tag_list_default_pagination(
  connection: api.IConnection,
): Promise<void> {
  // Call the tags index endpoint with empty body (default pagination)
  const response = await api.functional.discussionBoard.tags.index(connection, {
    body: {} satisfies IDiscussionBoardTag.IRequest,
  });
  typia.assert(response);
  // Validate default pagination values
  TestValidator.equals("default page is 1", response.pagination.current, 1);
  TestValidator.equals("default limit is 20", response.pagination.limit, 20);
  // Validate pagination calculations
  const expectedPages = Math.ceil(
    response.pagination.records / response.pagination.limit,
  );
  TestValidator.equals(
    "pages calculation is correct",
    response.pagination.pages,
    expectedPages,
  );
  // Validate records count is non-negative
  TestValidator.predicate(
    "records count is non-negative",
    response.pagination.records >= 0,
  );
  // Validate tags are sorted by name in ascending order
  for (let i = 0; i < response.data.length - 1; i++) {
    TestValidator.predicate(
      `tags sorted by name ascending at index ${i}`,
      response.data[i].name.localeCompare(response.data[i + 1].name) <= 0,
    );
  }
}
