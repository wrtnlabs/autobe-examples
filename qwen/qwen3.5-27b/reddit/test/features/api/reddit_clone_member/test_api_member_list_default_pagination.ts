import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCloneMember";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_member_list_default_pagination(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test the primary success path for retrieving a paginated list of member accounts with no filters applied.
   * Verifies response structure, pagination metadata, and member summary fields.
   */
  // Call the API with default pagination (empty body uses defaults: page=1, page_size=20)
  const response = await api.functional.redditClone.members.index(connection, {
    body: {} satisfies IRedditCloneMember.IRequest,
  });
  // Validate complete response structure
  typia.assert(response);
  // Verify pagination metadata
  TestValidator.equals("current page is 1", response.pagination.current, 1);
  TestValidator.equals("limit is 20 (default)", response.pagination.limit, 20);
  TestValidator.predicate(
    "total records is non-negative",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "total pages is non-negative",
    response.pagination.pages >= 0,
  );
  // Verify data array exists
  TestValidator.predicate("data array exists", Array.isArray(response.data));
  // Verify pagination consistency
  const expectedPages =
    response.pagination.records === 0
      ? 0
      : Math.ceil(response.pagination.records / response.pagination.limit);
  TestValidator.equals(
    "pages calculation is correct",
    response.pagination.pages,
    expectedPages,
  );
}
