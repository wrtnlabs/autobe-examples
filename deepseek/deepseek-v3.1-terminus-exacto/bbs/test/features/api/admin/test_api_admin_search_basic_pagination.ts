import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdmin";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_admin_search_basic_pagination(
  connection: api.IConnection,
): Promise<void> {
  // Test basic administrator search with default pagination
  const response = await api.functional.discussionBoard.admins.index(
    connection,
    {
      body: {} satisfies IDiscussionBoardAdmin.IRequest,
    },
  );
  typia.assert(response);
  // Validate data array structure
  TestValidator.equals("data is an array", Array.isArray(response.data), true);
  // Validate pagination calculations (business logic)
  if (response.pagination.limit > 0) {
    const expectedPages = Math.ceil(
      response.pagination.records / response.pagination.limit,
    );
    TestValidator.equals(
      "pages calculation matches records/limit",
      response.pagination.pages,
      expectedPages,
    );
  }
  // Validate data length matches pagination limit (business logic)
  if (response.pagination.current < response.pagination.pages) {
    TestValidator.equals(
      "data length matches limit",
      response.data.length,
      response.pagination.limit,
    );
  } else {
    // Last page may have fewer items
    TestValidator.predicate(
      "data length is less than or equal to limit",
      response.data.length <= response.pagination.limit,
    );
  }
}
