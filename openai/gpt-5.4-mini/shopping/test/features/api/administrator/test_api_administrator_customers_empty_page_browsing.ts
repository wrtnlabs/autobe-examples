import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCustomer";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_administrator_customers_empty_page_browsing(
  connection: api.IConnection,
): Promise<void> {
  const joined = await authorize_administrator_join(
    { host: connection.host },
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
      } satisfies IShoppingMallAdministrator.IJoin,
    },
  );
  const adminConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: joined.token.access,
    },
  };
  const search = RandomGenerator.alphabets(16);
  const accountStatus = RandomGenerator.alphabets(12);
  const firstPage =
    await api.functional.shoppingMall.administrator.customers.index(
      adminConnection,
      {
        body: {
          search,
          accountStatus,
          page: 1,
          limit: 10,
        } satisfies IShoppingMallCustomer.IRequest,
      },
    );
  typia.assert(firstPage);
  TestValidator.equals(
    "first page data should be empty",
    firstPage.data.length,
    0,
  );
  TestValidator.equals(
    "first page records should be zero",
    firstPage.pagination.records,
    0,
  );
  TestValidator.equals(
    "first page pages should be zero",
    firstPage.pagination.pages,
    0,
  );
  TestValidator.equals(
    "first page current should match request",
    firstPage.pagination.current,
    1,
  );
  TestValidator.equals(
    "first page limit should match request",
    firstPage.pagination.limit,
    10,
  );
  const highPage =
    await api.functional.shoppingMall.administrator.customers.index(
      adminConnection,
      {
        body: {
          search,
          accountStatus,
          page: 999999,
          limit: 10,
        } satisfies IShoppingMallCustomer.IRequest,
      },
    );
  typia.assert(highPage);
  TestValidator.equals(
    "high page data should be empty",
    highPage.data.length,
    0,
  );
  TestValidator.equals(
    "high page records should be zero",
    highPage.pagination.records,
    0,
  );
  TestValidator.equals(
    "high page pages should be zero",
    highPage.pagination.pages,
    0,
  );
  TestValidator.equals(
    "high page limit should match request",
    highPage.pagination.limit,
    10,
  );
}
