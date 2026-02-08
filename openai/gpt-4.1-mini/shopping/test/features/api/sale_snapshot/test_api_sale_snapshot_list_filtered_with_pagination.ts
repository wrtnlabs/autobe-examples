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

export async function test_api_sale_snapshot_list_filtered_with_pagination(
  connection: api.IConnection,
): Promise<void> {
  // Test retrieving sale snapshots with pagination without filters
  // 1. Administrator join and get authorized connection
  const adminConnection: api.IConnection = { host: connection.host };
  const adminJoinBody: IShoppingMallAdministrator.IJoin = {};
  const authorized = await authorize_administrator_join(adminConnection, {
    body: adminJoinBody,
  });
  adminConnection.headers = {
    Authorization: `Bearer ${authorized.token.access}`,
  };
  // 2. Request with empty filters and pagination
  const requestBody: IShoppingMallSaleSnapshot.IRequest = {};
  const response =
    await api.functional.shoppingMall.administrator.sale_snapshots.index(
      adminConnection,
      { body: requestBody },
    );
  typia.assert(response);
  // 3. Validate pagination meta
  const { pagination, data } = response;
  TestValidator.predicate(
    "pagination current at least 1",
    pagination.current >= 1,
  );
  TestValidator.predicate("pagination limit positive", pagination.limit > 0);
  TestValidator.predicate(
    "pagination pages zero or more",
    pagination.pages >= 0,
  );
  TestValidator.predicate(
    "pagination records zero or more",
    pagination.records >= 0,
  );
  // 4. Validate data array length
  TestValidator.predicate(
    "data length not exceed pagination limit",
    data.length <= pagination.limit,
  );
  // 5. Validate each snapshot item
  for (const snapshot of data) {
    typia.assert(snapshot);
  }
}
