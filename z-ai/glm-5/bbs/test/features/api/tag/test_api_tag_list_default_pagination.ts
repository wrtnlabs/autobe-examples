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
 * Test basic tag listing with default pagination parameters.
 *
 * Scenario: A user browses the available tags on the discussion board
 * without any search criteria.
 *
 * Steps:
 * 1. Send a PATCH request to /discussionBoard/tags with an empty request body
 * 2. Verify the response returns a paginated list of tags
 * 3. Validate pagination metadata: current page should be 1, limit should default to 20
 * 4. Verify each tag contains 'id' (UUID) and 'value' (string) properties
 * 5. Confirm tags are sorted by value in ascending order (default sorting)
 */
export async function test_api_tag_list_default_pagination(
  connection: api.IConnection,
): Promise<void> {
  // Call API with empty body to use default pagination
  const result = await api.functional.discussionBoard.tags.index(connection, {
    body: {} satisfies IDiscussionBoardTag.IRequest,
  });
  typia.assert(result);
  // Validate pagination metadata defaults
  TestValidator.equals(
    "current page defaults to 1",
    result.pagination.current,
    1,
  );
  TestValidator.equals("limit defaults to 20", result.pagination.limit, 20);
  // Validate pagination metadata structure
  TestValidator.predicate(
    "records is non-negative",
    result.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages is non-negative",
    result.pagination.pages >= 0,
  );
  // Validate tags are sorted by value in ascending order (business logic)
  for (let i = 1; i < result.data.length; i++) {
    TestValidator.predicate(
      "tags sorted by value ascending",
      result.data[i - 1].value <= result.data[i].value,
    );
  }
}
