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

export async function test_api_tags_index_pagination_edge_cases(
  connection: api.IConnection,
): Promise<void> {
  // Create actor-specific connection for tag API calls
  const adminConnection: api.IConnection = { host: connection.host };
  // Test 1: Request page beyond available pages (should return empty data)
  const outOfBoundsResponse: IPageIEconomicPoliticalBoardTag.ISummary =
    await api.functional.economicPoliticalBoard.tags.index(adminConnection, {
      body: {
        page: 9999,
        limit: 20,
      } satisfies IEconomicPoliticalBoardTag.IRequest,
    });
  typia.assert(outOfBoundsResponse);
  TestValidator.equals(
    "out of bounds - empty data",
    outOfBoundsResponse.data.length,
    0,
  );
  TestValidator.equals(
    "out of bounds - pagination current",
    outOfBoundsResponse.pagination.current,
    9999,
  );
  // Test 2: Request with large limit value (up to maximum 100)
  const largeLimitResponse: IPageIEconomicPoliticalBoardTag.ISummary =
    await api.functional.economicPoliticalBoard.tags.index(adminConnection, {
      body: {
        limit: 100,
        page: 1,
      } satisfies IEconomicPoliticalBoardTag.IRequest,
    });
  typia.assert(largeLimitResponse);
  TestValidator.predicate("large limit - valid pagination metadata", () => {
    return (
      largeLimitResponse.pagination.limit === 100 &&
      largeLimitResponse.pagination.current === 1
    );
  });
  // Test 3: Request with limit 1 (should return exactly one tag if available)
  const singleItemResponse: IPageIEconomicPoliticalBoardTag.ISummary =
    await api.functional.economicPoliticalBoard.tags.index(adminConnection, {
      body: {
        limit: 1,
        page: 1,
      } satisfies IEconomicPoliticalBoardTag.IRequest,
    });
  typia.assert(singleItemResponse);
  TestValidator.predicate(
    "single item limit - data count matches limit or less",
    () => singleItemResponse.data.length <= 1,
  );
  TestValidator.equals(
    "single item limit - pagination limit",
    singleItemResponse.pagination.limit,
    1,
  );
  // Test 4: Verify pagination metadata consistency
  const defaultResponse: IPageIEconomicPoliticalBoardTag.ISummary =
    await api.functional.economicPoliticalBoard.tags.index(adminConnection, {
      body: {
        page: 1,
        limit: 20,
      } satisfies IEconomicPoliticalBoardTag.IRequest,
    });
  typia.assert(defaultResponse);
  // Calculate expected pages count
  const expectedPages =
    defaultResponse.pagination.records > 0
      ? Math.ceil(
          defaultResponse.pagination.records / defaultResponse.pagination.limit,
        )
      : 0;
  TestValidator.equals(
    "pagination metadata - pages calculation",
    defaultResponse.pagination.pages,
    expectedPages,
  );
  TestValidator.equals(
    "pagination metadata - current page",
    defaultResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination metadata - limit",
    defaultResponse.pagination.limit,
    20,
  );
  TestValidator.equals(
    "pagination metadata - records count",
    defaultResponse.pagination.records,
    defaultResponse.data.length,
  );
}
