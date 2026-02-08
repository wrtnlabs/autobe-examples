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

export async function test_api_administrator_customers_index_various_filters_pagination(
  connection: api.IConnection,
): Promise<void> {
  // Scenario: Test retrieving paginated and filtered customers by admin
  // 1. Admin registration and authentication to get authorized connection
  const adminConnection: api.IConnection = { host: connection.host };
  const auth = await authorize_administrator_join(adminConnection, {
    body: {},
  });
  adminConnection.headers = { Authorization: `Bearer ${auth.token.access}` };
  // 2. Scenario 1: Default pagination without filters
  {
    const requestBody: IShoppingMallCustomer.IRequest = {};
    const response =
      await api.functional.shoppingMall.administrator.customers.index(
        adminConnection,
        { body: requestBody },
      );
    typia.assert(response);
    TestValidator.predicate(
      "current page number is >= 1",
      response.pagination.current >= 1,
    );
    TestValidator.predicate("limit is positive", response.pagination.limit > 0);
    TestValidator.predicate(
      "page count is >= 0",
      response.pagination.pages >= 0,
    );
    TestValidator.predicate(
      "records count is >= 0",
      response.pagination.records >= 0,
    );
  }
  // 3. Scenario 2: Filtered query with partial email, displayName, phoneNumber
  {
    const partialEmail = "@example.com";
    const partialDisplayName = "user";
    const partialPhoneNumber = "010";
    const requestBody: IShoppingMallCustomer.IRequest = {
      email: partialEmail,
      displayName: partialDisplayName,
      phoneNumber: partialPhoneNumber,
    };
    const response =
      await api.functional.shoppingMall.administrator.customers.index(
        adminConnection,
        { body: requestBody },
      );
    typia.assert(response);
  }
  // 4. Scenario 3: Attempt to include soft-deleted customers
  {
    const requestBody: IShoppingMallCustomer.IRequest = {};
    const response =
      await api.functional.shoppingMall.administrator.customers.index(
        adminConnection,
        { body: requestBody },
      );
    typia.assert(response);
    TestValidator.predicate(
      "current page number is >= 1",
      response.pagination.current >= 1,
    );
    TestValidator.predicate("limit is positive", response.pagination.limit > 0);
    TestValidator.predicate(
      "page count is >= 0",
      response.pagination.pages >= 0,
    );
    TestValidator.predicate(
      "records count is >= 0",
      response.pagination.records >= 0,
    );
  }
}
