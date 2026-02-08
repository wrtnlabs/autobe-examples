import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSaleUnitSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSaleUnitSnapshot";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallSaleUnitSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleUnitSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_sale_unit_snapshot_list_with_filters(
  connection: api.IConnection,
): Promise<void> {
  // Create an administrator connection
  const adminConnection: api.IConnection = { host: connection.host };
  // Authorize administrator join to obtain authorization
  const authorized = await authorize_administrator_join(adminConnection, {
    body: {}, // IShoppingMallAdministrator.IJoin has no properties
  });
  // Attach authorization token to headers for authenticated calls
  adminConnection.headers = {
    ...(adminConnection.headers ?? {}),
    Authorization: authorized.token.access,
  };
  // Prepare empty request body as per DTO definition
  const requestBody: IShoppingMallSaleUnitSnapshot.IRequest = {};
  // Call the index endpoint with empty filter
  const output =
    await api.functional.shoppingMall.administrator.sale_unit_snapshots.index(
      adminConnection,
      { body: requestBody },
    );
  // Validate response type
  typia.assert(output);
  // Validate pagination info
  TestValidator.predicate(
    "pagination current is >= 1",
    output.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit is >= 0",
    output.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination records is >= 0",
    output.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is >= 0",
    output.pagination.pages >= 0,
  );
  // Validate data array
  TestValidator.predicate("data is array", Array.isArray(output.data));
  // Iterate all snapshot summaries and assert type
  for (const snapshot of output.data) {
    typia.assert(snapshot);
  }
}
