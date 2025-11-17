import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicBoardCitizen } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardCitizen";
import type { IEconomicBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardModerator";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEconomicBoardCitizen } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconomicBoardCitizen";

export async function test_api_moderator_citizen_search_active_by_email(
  connection: api.IConnection,
) {
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = "password123";

  // Authenticate as moderator
  const moderator: IEconomicBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        password: moderatorPassword,
      } satisfies IEconomicBoardModerator.ICreate,
    });
  typia.assert(moderator);

  // Search for citizens with email substring 'test'
  const searchResult: IPageIEconomicBoardCitizen.ISummary =
    await api.functional.economicBoard.moderator.citizens.index(connection, {
      body: "test",
    });
  typia.assert(searchResult);

  // Validate pagination metadata as per scenario: page 1, limit 10
  TestValidator.equals(
    "pagination current page is 1",
    searchResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit is 10",
    searchResult.pagination.limit,
    10,
  );
}
