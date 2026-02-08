import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSellerSuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSellerSuspension";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallSellerSuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerSuspension";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_seller_suspensions_list_no_results(
  connection: api.IConnection,
): Promise<void> {
  // Administrator join for authorized connection
  const adminConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_administrator_join(adminConnection, {
    body: {},
  });
  adminConnection.headers = {
    ...adminConnection.headers,
    Authorization: `Bearer ${authorized.token.access}`,
  };
  // Test unauthorized access
  await TestValidator.httpError("unauthorized access", 401, async () => {
    await api.functional.shoppingMall.administrator.seller_suspensions.index(
      connection,
      {
        body: {},
      },
    );
  });
  // Request with empty filters since IRequest is empty
  const body: IShoppingMallSellerSuspension.IRequest = {};
  const response =
    await api.functional.shoppingMall.administrator.seller_suspensions.index(
      adminConnection,
      {
        body,
      },
    );
  typia.assert(response);
  // Validate empty data and pagination
  TestValidator.equals("data list empty", response.data.length, 0);
  TestValidator.equals(
    "pagination current page",
    response.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit", response.pagination.limit, 0);
  TestValidator.equals("pagination records", response.pagination.records, 0);
  TestValidator.equals("pagination pages", response.pagination.pages, 0);
}
