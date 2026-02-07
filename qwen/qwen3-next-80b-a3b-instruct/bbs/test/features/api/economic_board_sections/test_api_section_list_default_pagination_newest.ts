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

export async function test_api_section_list_default_pagination_newest(
  connection: api.IConnection,
): Promise<void> {
  // Use connection-based isolation pattern
  const connectionForTest: api.IConnection = { host: connection.host };
  // Call the API endpoint with empty request body (default pagination: page=1, limit=20)
  const response = await api.functional.economicBoard.sections.index(
    connectionForTest,
    { body: {} satisfies IEconomicBoardSection.IRequest },
  );
  // Validate response structure with typia.assert (mandatory)
  typia.assert(response);
  // Validate default pagination values
  TestValidator.equals("default page number", response.pagination.current, 1);
  TestValidator.equals("default page limit", response.pagination.limit, 20);
  // Validate that exactly 20 sections are returned (default limit)
  TestValidator.equals("number of sections returned", response.data.length, 20);
  // Validate that each section item is an object (per ISummary being {})
  // ISummary is an empty object - thus each item must be an object with no properties
  for (const section of response.data) {
    TestValidator.predicate("section is object", typeof section === "object");
    TestValidator.predicate("section is not null", section !== null);
  }
  // Validate total records count is at least 20 (meaning there are more sections available)
  TestValidator.predicate(
    "total records >= 20",
    response.pagination.records >= 20,
  );
}
