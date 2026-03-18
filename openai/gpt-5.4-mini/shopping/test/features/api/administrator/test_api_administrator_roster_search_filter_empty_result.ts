import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAdministrator";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_administrator_roster_search_filter_empty_result(
  connection: api.IConnection,
): Promise<void> {
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IShoppingMallAdministrator.IJoin,
  });
  typia.assert(admin);
  const emptyResult =
    await api.functional.shoppingMall.administrator.administrators.index(
      adminConnection,
      {
        body: {
          search: `__no_such_administrator__${RandomGenerator.alphaNumeric(24)}`,
          page: 1,
          limit: 10,
        } satisfies IShoppingMallAdministrator.IRequest,
      },
    );
  typia.assert(emptyResult);
  TestValidator.equals("empty roster data", emptyResult.data.length, 0);
  TestValidator.equals(
    "empty roster records",
    emptyResult.pagination.records,
    0,
  );
  TestValidator.equals("empty roster pages", emptyResult.pagination.pages, 0);
  TestValidator.equals(
    "empty roster current page",
    emptyResult.pagination.current,
    1,
  );
  TestValidator.equals("empty roster limit", emptyResult.pagination.limit, 10);
}
