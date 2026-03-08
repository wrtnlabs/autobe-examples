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

export async function test_api_tag_listing_basic_pagination(
  connection: api.IConnection,
): Promise<void> {
  // Test guest user accessing tag listing without authentication
  const output: IPageIDiscussionBoardTag.ISummary =
    await api.functional.discussionBoard.tags.index(connection, {
      body: {
        page: 1,
        limit: 10,
      } satisfies IDiscussionBoardTag.IRequest,
    });
  typia.assert(output);
  // Validate pagination metadata with business logic checks
  TestValidator.equals("current page is 1", output.pagination.current, 1);
  TestValidator.equals("limit is 10", output.pagination.limit, 10);
  TestValidator.predicate("total records >= 0", output.pagination.records >= 0);
  TestValidator.predicate("total pages >= 0", output.pagination.pages >= 0);
  // Validate pagination consistency: pages should be ceil(records / limit)
  const expectedPages = Math.ceil(
    output.pagination.records / output.pagination.limit,
  );
  TestValidator.equals(
    "total pages matches calculation",
    output.pagination.pages,
    expectedPages,
  );
  // Validate data array length matches pagination
  TestValidator.equals(
    "data array length within limit",
    output.data.length,
    Math.min(output.pagination.limit, output.pagination.records),
  );
  // Validate tag data exists when records > 0
  if (output.pagination.records > 0) {
    TestValidator.predicate("data array is not empty", output.data.length > 0);
  }
}
