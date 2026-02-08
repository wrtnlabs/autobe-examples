import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductSnapshot";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_product_snapshot_index_filtered_search(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator join (authenticate)
  const initialConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_administrator_join(initialConnection, {
    body: {},
  });
  // 2. Create admin connection with Authorization header
  const adminConnection: api.IConnection = { host: connection.host };
  adminConnection.headers = {
    Authorization: `Bearer ${authorized.token.access}`,
  };
  // 3. Prepare request body (empty since IShoppingMallProductSnapshot.IRequest is empty)
  const body: IShoppingMallProductSnapshot.IRequest = {};
  // 4. Invoke index API
  const output: IPageIShoppingMallProductSnapshot.ISummary =
    await api.functional.shoppingMall.administrator.productSnapshots.index(
      adminConnection,
      { body },
    );
  typia.assert(output);
  // 5. Validate pagination
  const { current, limit, records, pages } = output.pagination;
  TestValidator.predicate("pagination current page positive", current >= 1);
  TestValidator.predicate("pagination limit positive", limit >= 1);
  TestValidator.predicate("pagination pages non-negative", pages >= 0);
  TestValidator.predicate("pagination records non-negative", records >= 0);
  // 6. Validate each snapshot
  for (const snapshot of output.data) {
    typia.assert(snapshot);
  }
}
