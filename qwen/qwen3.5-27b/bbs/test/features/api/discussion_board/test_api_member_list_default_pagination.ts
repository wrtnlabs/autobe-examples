import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Test the primary success path for retrieving a paginated list of member profiles with default parameters.
 * Verifies response structure, pagination metadata, and default sorting behavior.
 */
export async function test_api_member_list_default_pagination(
  connection: api.IConnection,
): Promise<void> {
  // Create request body with default parameters (empty object uses all defaults)
  const body = {} satisfies IDiscussionBoardMember.IRequest;
  // Call the API to retrieve member list with default pagination
  const output = await api.functional.discussionBoard.members.index(
    connection,
    {
      body,
    },
  );
  // Validate response type
  typia.assert(output);
  // Verify pagination metadata has correct default values
  TestValidator.equals(
    "current page is 1 (default)",
    output.pagination.current,
    1,
  );
  TestValidator.equals("limit is 20 (default)", output.pagination.limit, 20);
  TestValidator.predicate(
    "records count is non-negative",
    output.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages count is non-negative",
    output.pagination.pages >= 0,
  );
  // Verify data array exists
  TestValidator.predicate("data array exists", output.data !== undefined);
  TestValidator.predicate("data is an array", Array.isArray(output.data));
  // Verify each member in the data array
  for (const member of output.data) {
    // Validate member type (this validates all required fields and formats)
    typia.assert(member);
  }
  // Verify default sorting: if there are multiple members, they should be sorted by created_at descending
  if (output.data.length > 1) {
    for (let i = 1; i < output.data.length; i++) {
      const prevDate = new Date(output.data[i - 1].created_at).getTime();
      const currDate = new Date(output.data[i].created_at).getTime();
      TestValidator.predicate(
        `members are sorted by created_at descending (index ${i - 1} >= ${i})`,
        prevDate >= currDate,
      );
    }
  }
  // Verify pagination consistency
  TestValidator.predicate(
    "pages calculation is correct",
    output.pagination.pages ===
      Math.ceil(output.pagination.records / output.pagination.limit),
  );
  // Verify data count matches limit or total records
  TestValidator.predicate(
    "data count does not exceed limit",
    output.data.length <= output.pagination.limit,
  );
  TestValidator.predicate(
    "data count does not exceed total records",
    output.data.length <= output.pagination.records,
  );
}
