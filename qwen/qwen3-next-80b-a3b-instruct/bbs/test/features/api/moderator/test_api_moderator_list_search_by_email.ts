import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardModerator";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEconomicBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconomicBoardModerator";

export async function test_api_moderator_list_search_by_email(
  connection: api.IConnection,
) {
  const moderator1 = await api.functional.auth.moderator.join(connection, {
    body: {
      email: "john.doe@domain.com",
      password: "password123",
    } satisfies IEconomicBoardModerator.ICreate,
  });
  typia.assert(moderator1);

  const moderator2 = await api.functional.auth.moderator.join(connection, {
    body: {
      email: "jane.smith@domain.com",
      password: "password123",
    } satisfies IEconomicBoardModerator.ICreate,
  });
  typia.assert(moderator2);

  const moderator3 = await api.functional.auth.moderator.join(connection, {
    body: {
      email: "john.doe@otherdomain.com",
      password: "password123",
    } satisfies IEconomicBoardModerator.ICreate,
  });
  typia.assert(moderator3);

  const searchResult =
    await api.functional.economicBoard.moderator.moderators.index(connection, {
      body: { search: "john.doe" } satisfies IEconomicBoardModerator.IRequest,
    });
  typia.assert(searchResult);

  const data = searchResult.data;

  TestValidator.equals(
    "pagination current page",
    searchResult.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit", searchResult.pagination.limit, 10);
  TestValidator.equals("matched count", data.length, 2);
  TestValidator.predicate(
    "contains john.doe@domain.com",
    data.includes("john.doe@domain.com"),
  );
  TestValidator.predicate(
    "contains john.doe@otherdomain.com",
    data.includes("john.doe@otherdomain.com"),
  );
  TestValidator.predicate(
    "excludes jane.smith@domain.com",
    !data.includes("jane.smith@domain.com"),
  );
}
