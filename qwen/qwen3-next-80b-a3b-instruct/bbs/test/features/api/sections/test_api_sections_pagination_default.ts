import api from "@ORGANIZATION/PROJECT-api";
import type { IEconomicBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEconomicBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconomicBoardSection";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_sections_pagination_default(
  connection: api.IConnection,
): Promise<void> {
  // Create a connection specific to the test
  const testConnection: api.IConnection = { host: connection.host };
  // Call the API endpoint to retrieve sections with default pagination (no filters)
  const result: IPageIEconomicBoardSection.ISummary =
    await api.functional.economicBoard.sections.index(testConnection, {
      body: {},
    });
  // Validate the response structure and type
  typia.assert(result);
  // Validate pagination metadata
  TestValidator.equals("current page is 1", result.pagination.current, 1);
  TestValidator.equals("default limit is 10", result.pagination.limit, 10);
  TestValidator.predicate("there are records", result.pagination.records >= 0);
  TestValidator.predicate("there are pages", result.pagination.pages >= 1);
  // Validate that data contains only sections
  TestValidator.predicate("data array is not empty", result.data.length > 0);
}
