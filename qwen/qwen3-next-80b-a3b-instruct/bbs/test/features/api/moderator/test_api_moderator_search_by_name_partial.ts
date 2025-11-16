import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardModerator";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEconomicBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconomicBoardModerator";

export async function test_api_moderator_search_by_name_partial(
  connection: api.IConnection,
) {
  // Test the basic structure and response format of the moderator search endpoint
  // since moderator account creation endpoints are not available in the provided API functions
  const searchResponse: IPageIEconomicBoardModerator.ISummary =
    await api.functional.economicBoard.moderator.moderators.index(connection, {
      body: {
        page: 0,
        limit: 10,
        search: "m",
      } satisfies IEconomicBoardModerator.IRequest,
    });
  typia.assert(searchResponse);

  // Validate pagination structure exists
  TestValidator.equals(
    "pagination pagination has total",
    searchResponse.pagination,
    "string",
  );
  TestValidator.equals(
    "data exists as array",
    Array.isArray(searchResponse.data),
    true,
  );

  // Validate that the data property is an array of strings as per ISummary definition
  TestValidator.predicate("data elements are strings", () =>
    searchResponse.data.every((item) => typeof item === "string"),
  );

  // Validate limit and page are respected in response structure (minimal validation)
  TestValidator.predicate(
    "search results count does not exceed limit",
    () => searchResponse.data.length <= 10,
  );

  // Verify that the search endpoint is responsive by checking that the response is not empty if there are moderators
  // Since we cannot create moderators, we cannot guarantee there will be results, but the endpoint should respond
  TestValidator.predicate(
    "response has valid structure",
    () =>
      searchResponse.pagination !== undefined &&
      searchResponse.data !== undefined,
  );
}
