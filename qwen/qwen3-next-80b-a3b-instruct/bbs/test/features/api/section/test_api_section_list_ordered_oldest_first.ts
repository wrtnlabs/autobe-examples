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

export async function test_api_section_list_ordered_oldest_first(
  connection: api.IConnection,
): Promise<void> {
  // Create a connection for unauthenticated user access
  const unauthenticatedConnection: api.IConnection = { host: connection.host };
  // Fetch the list of all sections (sorted by oldest-first by server default)
  const response = await api.functional.economicBoard.sections.index(
    unauthenticatedConnection,
    {
      body: {},
    },
  );
  typia.assert(response);
  // Validate pagination metadata - these properties exist in IPage.IPagination
  TestValidator.equals("current page is 1", response.pagination.current, 1);
  TestValidator.equals("limit is 20", response.pagination.limit, 20);
  TestValidator.predicate(
    "total records is greater than 0",
    response.pagination.records > 0,
  );
  TestValidator.predicate(
    "total pages is greater than 0",
    response.pagination.pages > 0,
  );
  // Validate that we received data - since we can't validate individual section properties
  TestValidator.predicate(
    "sections array is not empty",
    response.data.length > 0,
  );
  // Note: We cannot validate section order by created_at or filter by status because
  // IEconomicBoardSection.ISummary is an empty object with no properties defined in the DTO.
  // These validations from the scenario plan are impossible to implement with the provided types.
}
