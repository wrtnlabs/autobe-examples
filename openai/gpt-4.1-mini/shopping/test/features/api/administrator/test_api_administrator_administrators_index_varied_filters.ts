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

export async function test_api_administrator_administrators_index_varied_filters(
  connection: api.IConnection,
): Promise<void> {
  // Scenario 1: Retrieve a paginated list of administrators without filters
  // Scenario 2: Retrieve paginated list again to ensure consistent behavior
  // 1. Administrator setup and authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const adminJoinBody: IShoppingMallAdministrator.IJoin = {};
  const authorized = await authorize_administrator_join(adminConnection, {
    body: adminJoinBody,
  });
  typia.assert(authorized);
  adminConnection.headers ??= {};
  adminConnection.headers.Authorization = authorized.token.access;
  // Scenario 1: Default pagination, no filters
  {
    const requestBody1: IShoppingMallAdministrator.IRequest = {};
    const response1 =
      await api.functional.shoppingMall.administrator.administrators.index(
        adminConnection,
        {
          body: requestBody1,
        },
      );
    typia.assert(response1);
    // Validate response
    TestValidator.predicate(
      "pagination contains data count matching data length",
      response1.pagination.records >= response1.data.length,
    );
    // Verify response data is array
    TestValidator.predicate(
      "response data is array",
      Array.isArray(response1.data),
    );
  }
  // Scenario 2: Paginated list call repeated to ensure stability (no filters possible)
  {
    const requestBody2: IShoppingMallAdministrator.IRequest = {};
    const response2 =
      await api.functional.shoppingMall.administrator.administrators.index(
        adminConnection,
        {
          body: requestBody2,
        },
      );
    typia.assert(response2);
    // Validate response
    TestValidator.predicate(
      "pagination records count matches or exceeds data length",
      response2.pagination.records >= response2.data.length,
    );
    // Verify response data is array
    TestValidator.predicate(
      "response data is array",
      Array.isArray(response2.data),
    );
  }
}
