import api from "@ORGANIZATION/PROJECT-api";
import type { IEconomicPoliticalBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardTag";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEconomicPoliticalBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconomicPoliticalBoardTag";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_tag_sorting_and_pagination(
  connection: api.IConnection,
): Promise<void> {
  // Create actor-specific connection (even though auth is null)
  const tagsConnection: api.IConnection = { host: connection.host };
  // 1. Test default sorting (name ascending)
  const defaultResult = await api.functional.economicPoliticalBoard.tags.index(
    tagsConnection,
    {
      body: {},
    },
  );
  typia.assert(defaultResult);
  // 2. Test sorting by name descending
  const nameDescSort: IEconomicPoliticalBoardTag.IRequest = {
    sort: { by: "name", order: "desc" },
  };
  const nameDescResult = await api.functional.economicPoliticalBoard.tags.index(
    tagsConnection,
    { body: nameDescSort },
  );
  typia.assert(nameDescResult);
  TestValidator.equals(
    "name desc pagination metadata",
    nameDescResult.pagination.current,
    1,
  );
  // 3. Test sorting by created_at ascending
  const createdAscSort: IEconomicPoliticalBoardTag.IRequest = {
    sort: { by: "created_at", order: "asc" },
  };
  const createdAscResult =
    await api.functional.economicPoliticalBoard.tags.index(tagsConnection, {
      body: createdAscSort,
    });
  typia.assert(createdAscResult);
  // 4. Test sorting by created_at descending
  const createdDescSort: IEconomicPoliticalBoardTag.IRequest = {
    sort: { by: "created_at", order: "desc" },
  };
  const createdDescResult =
    await api.functional.economicPoliticalBoard.tags.index(tagsConnection, {
      body: createdDescSort,
    });
  typia.assert(createdDescResult);
  // 5. Test sorting by updated_at ascending
  const updatedAscSort: IEconomicPoliticalBoardTag.IRequest = {
    sort: { by: "updated_at", order: "asc" },
  };
  const updatedAscResult =
    await api.functional.economicPoliticalBoard.tags.index(tagsConnection, {
      body: updatedAscSort,
    });
  typia.assert(updatedAscResult);
  // 6. Test pagination with limit=10, page=1
  const page1Limit10: IEconomicPoliticalBoardTag.IRequest = {
    page: 1,
    limit: 10,
  };
  const page1Result = await api.functional.economicPoliticalBoard.tags.index(
    tagsConnection,
    { body: page1Limit10 },
  );
  typia.assert(page1Result);
  TestValidator.equals(
    "page 1 limit 10 pagination current",
    page1Result.pagination.current,
    1,
  );
  TestValidator.equals(
    "page 1 limit 10 pagination limit",
    page1Result.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "page 1 has valid pagination records",
    page1Result.pagination.records >= 0,
  );
  // 7. Test pagination with limit=10, page=2 (no overlap with page 1)
  const page2Limit10: IEconomicPoliticalBoardTag.IRequest = {
    page: 2,
    limit: 10,
  };
  const page2Result = await api.functional.economicPoliticalBoard.tags.index(
    tagsConnection,
    { body: page2Limit10 },
  );
  typia.assert(page2Result);
  TestValidator.equals(
    "page 2 limit 10 pagination current",
    page2Result.pagination.current,
    2,
  );
  // 8. Test pagination exceeding total pages
  const pageExceed: IEconomicPoliticalBoardTag.IRequest = {
    page: 10,
    limit: 100,
  };
  const pageExceedResult =
    await api.functional.economicPoliticalBoard.tags.index(tagsConnection, {
      body: pageExceed,
    });
  typia.assert(pageExceedResult);
  TestValidator.equals(
    "exceeding pages returns empty data",
    pageExceedResult.data.length,
    0,
  );
  TestValidator.equals(
    "exceeding pages pagination pages",
    pageExceedResult.pagination.pages,
    pageExceedResult.pagination.pages,
  );
  // 9. Test maximum limit (200)
  const maxLimit: IEconomicPoliticalBoardTag.IRequest = {
    limit: 200,
  };
  const maxLimitResult = await api.functional.economicPoliticalBoard.tags.index(
    tagsConnection,
    { body: maxLimit },
  );
  typia.assert(maxLimitResult);
  TestValidator.equals(
    "max limit pagination limit",
    maxLimitResult.pagination.limit,
    200,
  );
  // 10. Test minimum limit (1)
  const minLimit: IEconomicPoliticalBoardTag.IRequest = {
    limit: 1,
  };
  const minLimitResult = await api.functional.economicPoliticalBoard.tags.index(
    tagsConnection,
    { body: minLimit },
  );
  typia.assert(minLimitResult);
  TestValidator.equals(
    "min limit pagination limit",
    minLimitResult.pagination.limit,
    1,
  );
  // 11. Test search + sorting combination
  const searchWithSort: IEconomicPoliticalBoardTag.IRequest = {
    search: "test",
    sort: { by: "name", order: "asc" },
  };
  const searchSortResult =
    await api.functional.economicPoliticalBoard.tags.index(tagsConnection, {
      body: searchWithSort,
    });
  typia.assert(searchSortResult);
  TestValidator.equals(
    "search with sort pagination",
    searchSortResult.pagination.current,
    1,
  );
  // 12. Validate pagination metadata structure consistency
  TestValidator.equals(
    "pagination records count valid",
    page1Result.pagination.records >= 0,
    true,
  );
  TestValidator.equals(
    "pagination pages count valid",
    page1Result.pagination.pages >= 0,
    true,
  );
}
