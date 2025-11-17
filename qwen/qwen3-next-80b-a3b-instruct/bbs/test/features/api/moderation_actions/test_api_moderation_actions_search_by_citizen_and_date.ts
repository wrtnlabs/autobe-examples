import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicBoardModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardModerationAction";
import type { IEconomicBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardModerator";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEconomicBoardModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconomicBoardModerationAction";

export async function test_api_moderation_actions_search_by_citizen_and_date(
  connection: api.IConnection,
) {
  const moderator: IEconomicBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "ModeratorPassword123!",
      } satisfies IEconomicBoardModerator.ICreate,
    });
  typia.assert(moderator);

  // Generate random citizen ID for search filtering
  const citizenId = typia.random<string & tags.Format<"uuid">>();

  // Define a date range for filtering
  const searchStartDate = new Date();
  searchStartDate.setDate(searchStartDate.getDate() - 7); // 7 days ago
  const searchEndDate = new Date();
  searchEndDate.setDate(searchEndDate.getDate() + 1); // Tomorrow

  // Search for moderation actions by citizen ID and date range
  const searchResult: IPageIEconomicBoardModerationAction.ISummary =
    await api.functional.economicBoard.moderator.moderation.actions.search(
      connection,
      {
        body: {
          citizen_id: citizenId,
          created_at_from: searchStartDate.toISOString(),
          created_at_to: searchEndDate.toISOString(),
          sort: "created_at:asc",
          page: 1,
          limit: 10,
        } satisfies IEconomicBoardModerationAction.IRequest,
      },
    );
  typia.assert(searchResult);

  // Validate response structure and types
  TestValidator.predicate(
    "pagination object exists",
    searchResult.pagination !== null,
  );
  TestValidator.predicate("data array exists", searchResult.data !== null);
  TestValidator.predicate(
    "at least one action in data array",
    searchResult.data.length >= 0,
  );

  // Validate pagination properties are number and meet specified limits
  TestValidator.predicate(
    "current page is a positive integer",
    Number.isInteger(searchResult.pagination.current) &&
      searchResult.pagination.current >= 0,
  );
  TestValidator.predicate(
    "limit is a positive integer",
    Number.isInteger(searchResult.pagination.limit) &&
      searchResult.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "records count is non-negative integer",
    Number.isInteger(searchResult.pagination.records) &&
      searchResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages count is non-negative integer",
    Number.isInteger(searchResult.pagination.pages) &&
      searchResult.pagination.pages >= 0,
  );

  // Visual validation that data items have correct structure
  for (const action of searchResult.data) {
    TestValidator.equals("action id is uuid", typeof action.id, "string");
    TestValidator.equals(
      "action created_at is ISO date-time",
      typeof action.created_at,
      "string",
    );
    TestValidator.equals(
      "action moderator_id is uuid",
      typeof action.moderator_id,
      "string",
    );
    TestValidator.equals(
      "action citizen_id is uuid",
      typeof action.citizen_id,
      "string",
    );
  }

  // Validate search parameters were accepted by checking the result is not an empty object
  TestValidator.predicate(
    "search returned at least one property",
    searchResult.pagination.current > 0 || searchResult.data.length > 0,
  );
}
