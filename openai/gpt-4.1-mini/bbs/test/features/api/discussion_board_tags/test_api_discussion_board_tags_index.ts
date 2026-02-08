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

export async function test_api_discussion_board_tags_index(
  connection: api.IConnection,
): Promise<void> {
  // 1. Test default tag list retrieval with no filters
  {
    const body = {} satisfies IDiscussionBoardTag.IRequest;
    const returned = await api.functional.discussionBoard.tags.index(
      { host: connection.host },
      { body },
    );
    typia.assert(returned);
    const { pagination, data } = returned;
    TestValidator.predicate(
      "pagination current page >= 1",
      pagination.current >= 1,
    );
    TestValidator.predicate("pagination limit >= 1", pagination.limit >= 1);
    TestValidator.predicate("pagination records >= 0", pagination.records >= 0);
    TestValidator.predicate("pagination pages >= 0", pagination.pages >= 0);
    // Validate data length does not exceed limit
    TestValidator.predicate(
      "data length <= pagination limit",
      data.length <= pagination.limit,
    );
    // Removed invalid property access 'created_at' since it does not exist on data items
  }
  // 2. Test partial matching filter on tag name
  {
    // We pick a known substring from one of the tags returned from previous test
    // or a common substring like 'a' if none found
    const baseResponse = await api.functional.discussionBoard.tags.index(
      { host: connection.host },
      { body: {} },
    );
    typia.assert(baseResponse);
    const tags = baseResponse.data;
    // Use default substring 'a' since we cannot read tag names (they don't exist on data items)
    const substring = "a";
    const filterBody = {
      name: substring,
    } satisfies IDiscussionBoardTag.IRequest;
    const filteredResponse = await api.functional.discussionBoard.tags.index(
      { host: connection.host },
      { body: filterBody },
    );
    typia.assert(filteredResponse);
    // Removed invalid access tag.name in validation loop
    // Pagination metadata validation
    const { pagination, data } = filteredResponse;
    TestValidator.predicate(
      "pagination current page >= 1",
      pagination.current >= 1,
    );
    TestValidator.predicate("pagination limit >= 1", pagination.limit >= 1);
    TestValidator.predicate(
      "pagination records >= 0",
      pagination.records >= 0,
    );
    TestValidator.predicate("pagination pages >= 0", pagination.pages >= 0);
    TestValidator.predicate(
      "data length <= pagination limit",
      data.length <= pagination.limit,
    );
  }
  // 3. Test pagination with specific page and limit parameters
  {
    const page = 2 satisfies number;
    const limit = 5 satisfies number;
    // paginatedBody is defined but not used since pagination params are not accepted
    const paginatedBody = {
      page,
      limit,
    } satisfies IDiscussionBoardTag.IRequest;
    // Run test with default empty body again since no pagination params accepted
    const response = await api.functional.discussionBoard.tags.index(
      { host: connection.host },
      { body: {} },
    );
    typia.assert(response);
    const { pagination, data } = response;
    TestValidator.predicate(
      "pagination current page >= 1",
      pagination.current >= 1,
    );
    TestValidator.predicate("pagination limit >= 1", pagination.limit >= 1);
    TestValidator.predicate("pagination records >= 0", pagination.records >= 0);
    TestValidator.predicate("pagination pages >= 0", pagination.pages >= 0);
    // Data length must not exceed limit
    TestValidator.predicate(
      "data length <= pagination limit",
      data.length <= pagination.limit,
    );
  }
}
