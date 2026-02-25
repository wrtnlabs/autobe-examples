import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSaleFavorite } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSaleFavorite";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductCategory";
import type { IShoppingMallSale } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSale";
import type { IShoppingMallSaleFavorite } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleFavorite";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_favorites_summary_empty(
  connection: api.IConnection,
): Promise<void> {
  // Create a new connection for the customer
  const customerConnection: api.IConnection = { host: connection.host };
  // Join a new customer and authorize
  const authorizedCustomer = await authorize_customer_join(
    customerConnection,
    {},
  );
  customerConnection.headers = {
    Authorization: authorizedCustomer.token.access,
  };
  // Prepare empty favorites request body
  const body: IShoppingMallSaleFavorite.IRequest = {
    page: 1,
    limit: 10,
  };
  // Call the patch endpoint to get favorites summary
  const response =
    await api.functional.shoppingMall.customer.favorites.summary.index(
      customerConnection,
      { body },
    );
  typia.assert(response);
  // Verify pagination properties
  TestValidator.equals(
    "current page should be 1",
    response.pagination.current,
    1,
  );
  TestValidator.equals("limit should be 10", response.pagination.limit, 10);
  TestValidator.equals(
    "total records should be 0",
    response.pagination.records,
    0,
  );
  TestValidator.equals("total pages should be 0", response.pagination.pages, 0);
  // Verify data is empty array
  TestValidator.equals("data should be empty array", response.data.length, 0);
}
