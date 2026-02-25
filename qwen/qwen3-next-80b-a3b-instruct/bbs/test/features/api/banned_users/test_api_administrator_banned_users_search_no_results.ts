import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardAdministrator";
import type { IEconomicBoardCitizen } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardCitizen";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEconomicBoardCitizen } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconomicBoardCitizen";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_administrator_banned_users_search_no_results(
  connection: api.IConnection,
): Promise<void> {
  // Create administrator connection and authenticate using utility function
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IEconomicBoardAdministrator.IJoin,
  });
  // Search for banned users with a non-existent ban reason
  const searchResult =
    await api.functional.economicBoard.administrator.banned_users.index(
      adminConnection,
      {
        body: {
          search: "xyz123invalid", // Non-existent ban reason - 12 chars, >3 char minimum
        } satisfies IEconomicBoardCitizen.IRequest,
      },
    );
  typia.assert(searchResult);
  // Validate pagination and data structure for empty results
  TestValidator.equals(
    "pagination current page",
    searchResult.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit", searchResult.pagination.limit, 25);
  TestValidator.equals(
    "pagination records",
    searchResult.pagination.records,
    0,
  );
  TestValidator.equals("pagination pages", searchResult.pagination.pages, 0);
  TestValidator.equals("data array length", searchResult.data.length, 0);
}
