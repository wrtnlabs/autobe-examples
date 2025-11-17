import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicBoardModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardModerationAction";
import type { IEconomicBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardModerator";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEconomicBoardModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconomicBoardModerationAction";

export async function test_api_moderation_actions_search_pagination(
  connection: api.IConnection,
) {
  // Authenticate as moderator
  const moderator: IEconomicBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "password123",
      } satisfies IEconomicBoardModerator.ICreate,
    });
  typia.assert(moderator);

  // Search moderation actions with pagination: page=2, limit=5
  const searchResponse: IPageIEconomicBoardModerationAction.ISummary =
    await api.functional.economicBoard.moderator.moderation.actions.search(
      connection,
      {
        body: {
          page: 2,
          limit: 5,
        } satisfies IEconomicBoardModerationAction.IRequest,
      },
    );
  typia.assert(searchResponse);

  // Validate pagination metadata
  TestValidator.equals(
    "pagination current page should be 2",
    searchResponse.pagination.current,
    2,
  );
  TestValidator.equals(
    "pagination limit should be 5",
    searchResponse.pagination.limit,
    5,
  );
  TestValidator.predicate(
    "pagination records should be at least 10",
    searchResponse.pagination.records >= 10,
  );
  TestValidator.predicate(
    "pagination pages should be at least 2",
    searchResponse.pagination.pages >= 2,
  );

  // Validate data array has exactly 5 items
  TestValidator.equals(
    "data array length should be 5",
    searchResponse.data.length,
    5,
  );
}
