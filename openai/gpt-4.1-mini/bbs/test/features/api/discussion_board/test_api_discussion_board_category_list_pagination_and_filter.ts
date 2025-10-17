import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardDiscussionBoardCategories } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardDiscussionBoardCategories";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardDiscussionBoardCategories } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardDiscussionBoardCategories";

export async function test_api_discussion_board_category_list_pagination_and_filter(
  connection: api.IConnection,
) {
  // Test 1: Basic pagination and sorting by 'name' ascending
  const page1Body = {
    page: 1,
    limit: 5,
    sort_by: "name",
    order: "asc",
  } satisfies IDiscussionBoardDiscussionBoardCategories.IRequest;

  const response1 =
    await api.functional.discussionBoard.discussionBoardCategories.index(
      connection,
      {
        body: page1Body,
      },
    );
  typia.assert(response1);

  // Validate pagination info
  TestValidator.predicate(
    "pagination current page should be 1",
    response1.pagination.current === 1,
  );
  TestValidator.predicate(
    "pagination limit should be 5",
    response1.pagination.limit === 5,
  );
  TestValidator.predicate(
    "pagination pages should be >= 1",
    response1.pagination.pages >= 1,
  );
  TestValidator.predicate(
    "pagination records should be >= 0",
    response1.pagination.records >= 0,
  );

  // Validate sorting: 'name' ascending order
  const names1 = response1.data.map((c) => c.name);
  const sortedNames1 = [...names1].sort((a, b) => a.localeCompare(b));
  TestValidator.equals("names are sorted ascending", names1, sortedNames1);

  // Test 2: Filter by exact 'Economic' name
  const filterEconomicBody = {
    name: "Economic",
    page: 1,
    limit: 10,
    sort_by: "created_at",
    order: "desc",
  } satisfies IDiscussionBoardDiscussionBoardCategories.IRequest;

  const response2 =
    await api.functional.discussionBoard.discussionBoardCategories.index(
      connection,
      {
        body: filterEconomicBody,
      },
    );
  typia.assert(response2);

  // Validate all returned categories have name 'Economic'
  TestValidator.predicate(
    "all categories name should be Economic",
    response2.data.every((cat) => cat.name === "Economic"),
  );

  // Test 3: Filter by exact 'Political' name
  const filterPoliticalBody = {
    name: "Political",
    page: 1,
    limit: 10,
    sort_by: "updated_at",
    order: "asc",
  } satisfies IDiscussionBoardDiscussionBoardCategories.IRequest;

  const response3 =
    await api.functional.discussionBoard.discussionBoardCategories.index(
      connection,
      {
        body: filterPoliticalBody,
      },
    );
  typia.assert(response3);

  TestValidator.predicate(
    "all categories name should be Political",
    response3.data.every((cat) => cat.name === "Political"),
  );

  // Test 4: Empty name filter to test empty or all results handling
  const emptyFilterBody = {
    name: "",
    page: 1,
    limit: 5,
    sort_by: "name",
    order: "asc",
  } satisfies IDiscussionBoardDiscussionBoardCategories.IRequest;

  const response4 =
    await api.functional.discussionBoard.discussionBoardCategories.index(
      connection,
      {
        body: emptyFilterBody,
      },
    );
  typia.assert(response4);
  TestValidator.predicate(
    "pagination records should be >= data length",
    response4.pagination.records >= response4.data.length,
  );

  // Test 5: Pagination check: get second page if exists
  if (response4.pagination.pages > 1) {
    const page2Body = {
      ...emptyFilterBody,
      page: 2,
    } satisfies IDiscussionBoardDiscussionBoardCategories.IRequest;

    const response5 =
      await api.functional.discussionBoard.discussionBoardCategories.index(
        connection,
        {
          body: page2Body,
        },
      );
    typia.assert(response5);

    TestValidator.predicate(
      "pagination current page should be 2",
      response5.pagination.current === 2,
    );
    TestValidator.predicate(
      "page 2 data should have no overlap with page 1",
      !response5.data.some((cat) =>
        response4.data.some((c1) => c1.id === cat.id),
      ),
    );
  }

  // Test 6: Filter with no matches (name unlikely to exist)
  const noMatchBody = {
    name: "NonexistentCategoryName",
    page: 1,
    limit: 10,
  } satisfies IDiscussionBoardDiscussionBoardCategories.IRequest;

  const response6 =
    await api.functional.discussionBoard.discussionBoardCategories.index(
      connection,
      {
        body: noMatchBody,
      },
    );
  typia.assert(response6);
  TestValidator.equals(
    "no data when filtering non-existent category",
    response6.data.length,
    0,
  );
}
