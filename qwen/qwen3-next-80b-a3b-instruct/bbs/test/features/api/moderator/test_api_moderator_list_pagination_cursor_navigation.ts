import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardModerator";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEconomicBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconomicBoardModerator";

export async function test_api_moderator_list_pagination_cursor_navigation(
  connection: api.IConnection,
) {
  const moderator1 = await api.functional.auth.moderator.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
    } satisfies IEconomicBoardModerator.ICreate,
  });
  typia.assert(moderator1);

  const moderator2 = await api.functional.auth.moderator.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
    } satisfies IEconomicBoardModerator.ICreate,
  });
  typia.assert(moderator2);

  const moderator3 = await api.functional.auth.moderator.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
    } satisfies IEconomicBoardModerator.ICreate,
  });
  typia.assert(moderator3);

  const moderator4 = await api.functional.auth.moderator.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
    } satisfies IEconomicBoardModerator.ICreate,
  });
  typia.assert(moderator4);

  const firstPage: IPageIEconomicBoardModerator.ISummary =
    await api.functional.economicBoard.moderator.moderators.index(connection, {
      body: {
        limit: 2,
      } satisfies IEconomicBoardModerator.IRequest,
    });
  typia.assert(firstPage);

  // Extract the moderator IDs from the string summary
  const page1Ids = firstPage.data;
  TestValidator.equals("first page has 2 items", page1Ids.length, 2);
  TestValidator.equals(
    "first page has correct pagination",
    firstPage.pagination.limit,
    2,
  );
  TestValidator.equals(
    "total records correct",
    firstPage.pagination.records,
    4,
  );

  // Get the last ID from first page to use as cursor
  const cursor = page1Ids[page1Ids.length - 1];

  const secondPage: IPageIEconomicBoardModerator.ISummary =
    await api.functional.economicBoard.moderator.moderators.index(connection, {
      body: {
        limit: 2,
        cursor,
      } satisfies IEconomicBoardModerator.IRequest,
    });
  typia.assert(secondPage);

  const page2Ids = secondPage.data;
  TestValidator.equals("second page has 2 items", page2Ids.length, 2);
  TestValidator.equals(
    "second page has correct pagination",
    secondPage.pagination.limit,
    2,
  );

  // Validate the cursor transition: first page ends with cursor, second page starts with the next moderator
  TestValidator.equals(
    "cursor matches last item of first page",
    cursor,
    page1Ids[1],
  );

  // Verify all four moderators are accounted for across pages
  const allIds = [moderator1.id, moderator2.id, moderator3.id, moderator4.id];
  const page1Set = new Set(page1Ids);
  const page2Set = new Set(page2Ids);

  TestValidator.predicate("no duplicates between pages", () => {
    // If there's any overlap, then a moderator appears in both pages
    return !ArrayUtil.has(page1Ids, (id) => page2Set.has(id));
  });

  TestValidator.predicate("all four moderators accounted for", () => {
    return (
      page1Set.size === 2 &&
      page2Set.size === 2 &&
      page1Set.size + page2Set.size === 4 &&
      allIds.every((id) => page1Set.has(id) || page2Set.has(id))
    );
  });
}
