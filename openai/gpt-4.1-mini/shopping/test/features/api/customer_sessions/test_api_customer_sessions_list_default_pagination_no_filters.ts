import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCustomerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCustomerSession";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_sessions_list_default_pagination_no_filters(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer registration and authorization
  const customerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_customer_join(customerConnection, {
    body: typia.random<IShoppingMallCustomer.IJoin>(),
  });
  customerConnection.headers = {
    Authorization: authorized.token.access,
  };
  // 2. Request session listing with default pagination and no filters
  const response = await api.functional.shoppingMall.customer.sessions.index(
    customerConnection,
    {
      body: {}, // empty request means default pagination, no filters
    },
  );
  // Assert entire response
  typia.assert(response);
  // 3. Validate pagination info
  const { pagination, data } = response;
  TestValidator.predicate(
    "pagination current page number is 1",
    pagination.current === 1,
  );
  TestValidator.predicate(
    "pagination limit is positive number",
    pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records is non-negative number",
    pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative number",
    pagination.pages >= 0,
  );
  // 4. Validate session list exists
  TestValidator.predicate("session data is array", Array.isArray(data));
  // 5. Due to DTO empty definition, unable to validate individual session properties or sorting
}
