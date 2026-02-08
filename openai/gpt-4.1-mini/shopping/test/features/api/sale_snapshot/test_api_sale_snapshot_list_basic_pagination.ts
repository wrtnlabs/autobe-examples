import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSaleSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSaleSnapshot";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallSaleSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_sale_snapshot_list_basic_pagination(
  connection: api.IConnection,
): Promise<void> {
  // Administrator authorization
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuthorized = await authorize_administrator_join(adminConnection, {
    body: {},
  });
  adminConnection.headers ??= {};
  adminConnection.headers.Authorization = `Bearer ${adminAuthorized.token.access}`;
  // Request with empty filter body
  const body: IShoppingMallSaleSnapshot.IRequest = {};
  const output =
    await api.functional.shoppingMall.administrator.sale_snapshots.index(
      adminConnection,
      {
        body,
      },
    );
  typia.assert(output);
  // Validate pagination metadata
  TestValidator.predicate(
    "pagination current page is positive",
    output.pagination.current > 0,
  );
  TestValidator.predicate(
    "pagination records count is non-negative",
    output.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages count is non-negative",
    output.pagination.pages >= 0,
  );
  // Validate each sale snapshot summary object
  for (const snapshot of output.data) {
    typia.assert(snapshot);
  }
}
