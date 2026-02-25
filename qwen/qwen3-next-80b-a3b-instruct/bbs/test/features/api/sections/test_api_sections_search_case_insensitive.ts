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

export async function test_api_sections_search_case_insensitive(
  connection: api.IConnection,
): Promise<void> {
  // Search sections with case-insensitive term 'poli' to find 'Politics'
  const searchConnection: api.IConnection = { host: connection.host };
  const result = await api.functional.economicBoard.sections.index(
    searchConnection,
    {
      body: {
        search: "poli",
      } satisfies IEconomicBoardSection.IRequest,
    },
  );
  typia.assert(result);
  // Validate that we got sections with case-insensitive match
  // Assuming 'Politics' section exists (as per test data setup requirement)
  TestValidator.equals("total records match", result.pagination.records, 1);
  TestValidator.equals(
    "correct number of sections returned",
    result.data.length,
    1,
  );
  TestValidator.equals("section name matches", result.data[0].name, "Politics");
  // Verify the search is case-insensitive by testing with 'POLI'
  const upperCaseResult = await api.functional.economicBoard.sections.index(
    searchConnection,
    {
      body: {
        search: "POLI",
      } satisfies IEconomicBoardSection.IRequest,
    },
  );
  typia.assert(upperCaseResult);
  TestValidator.equals(
    "case-insensitive search works with uppercase",
    upperCaseResult.pagination.records,
    1,
  );
  TestValidator.equals(
    "case-insensitive search returns same section",
    upperCaseResult.data[0].name,
    "Politics",
  );
}
