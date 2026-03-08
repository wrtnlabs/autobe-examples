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

export async function test_api_member_list_pagination(
  connection: api.IConnection,
): Promise<void> {
  // Test basic pagination with default sorting (created_at desc)
  const response = await api.functional.discussionBoard.members.index(
    connection,
    {
      body: {
        page: 1,
        limit: 10,
      } satisfies IDiscussionBoardMember.IRequest,
    },
  );
  typia.assert(response);
  // Verify pagination metadata
  TestValidator.equals("current page is 1", response.pagination.current, 1);
  TestValidator.equals("limit is 10", response.pagination.limit, 10);
  TestValidator.predicate(
    "records count is non-negative",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages count is non-negative",
    response.pagination.pages >= 0,
  );
  // Verify pagination calculation
  const expectedPages =
    response.pagination.records > 0
      ? Math.ceil(response.pagination.records / response.pagination.limit)
      : 0;
  TestValidator.equals(
    "total pages calculation",
    response.pagination.pages,
    expectedPages,
  );
  // Verify all members have required public fields (validated by typia.assert)
  // typia.assert validates: id (UUID), displayName (string), bio (string | null), banned (boolean), createdAt (date-time)
  for (const member of response.data) {
    typia.assert(member);
  }
  // Verify sorting by created_at in descending order (default)
  if (response.data.length > 1) {
    const dates = response.data.map((m) => new Date(m.createdAt).getTime());
    for (let i = 0; i < dates.length - 1; i++) {
      TestValidator.predicate(
        "members sorted by created_at desc",
        dates[i] >= dates[i + 1],
      );
    }
  }
  // Test second page pagination
  if (response.pagination.pages > 1) {
    const page2Response = await api.functional.discussionBoard.members.index(
      connection,
      {
        body: {
          page: 2,
          limit: 10,
        } satisfies IDiscussionBoardMember.IRequest,
      },
    );
    typia.assert(page2Response);
    TestValidator.equals(
      "second page number",
      page2Response.pagination.current,
      2,
    );
    TestValidator.notEquals(
      "different members on page 2",
      response.data[0]?.id ?? "",
      page2Response.data[0]?.id ?? "",
    );
  }
}
