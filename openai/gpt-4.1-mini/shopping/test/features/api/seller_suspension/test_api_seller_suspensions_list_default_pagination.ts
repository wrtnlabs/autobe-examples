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

export async function test_api_seller_suspensions_list_default_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator join and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuthorized = await authorize_administrator_join(adminConnection, {
    body: {},
  });
  // Use authorized connection with proper headers updated by utility function
  adminConnection.headers = adminConnection.headers ?? {};
  adminConnection.headers.Authorization = adminAuthorized.token.access;
  // 2. Call the seller_suspensions.index endpoint with empty filters (default pagination)
  const output =
    await api.functional.shoppingMall.administrator.seller_suspensions.index(
      adminConnection,
      { body: {} },
    );
  typia.assert(output);
  // 3. Validate pagination metadata
  const pagination = output.pagination;
  TestValidator.predicate(
    "pagination current page is >= 1",
    pagination.current >= 1,
  );
  TestValidator.predicate("pagination limit is >= 0", pagination.limit >= 0);
  TestValidator.predicate(
    "pagination total records is >= 0",
    pagination.records >= 0,
  );
  TestValidator.predicate("pagination pages is >= 0", pagination.pages >= 0);
  if (pagination.records === 0) {
    TestValidator.equals("pages is zero when no records", pagination.pages, 0);
  } else {
    TestValidator.equals(
      "pages equals ceil(records / limit)",
      pagination.pages,
      Math.ceil(pagination.records / pagination.limit),
    );
  }
  // 4. Check that the data array exists and is an array
  TestValidator.predicate("data is an array", Array.isArray(output.data));
  // 5. Attempt unauthorized access should fail (unauthenticated)
  const unauthorizedConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError(
    "unauthorized access to seller suspensions",
    401,
    async () => {
      await api.functional.shoppingMall.administrator.seller_suspensions.index(
        unauthorizedConnection,
        { body: {} },
      );
    },
  );
}
