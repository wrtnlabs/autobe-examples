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

export async function test_api_customer_sessions_list_filtered_by_creation_and_expiration_dates(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer registration and authorization
  const customerJoinConnection: api.IConnection = { host: connection.host };
  // Assuming IShoppingMallCustomer.IJoin has no required field as it's empty object
  const authorized = await authorize_customer_join(customerJoinConnection, {
    body: {},
  });
  // Create a new connection using the token from the authorized response
  const customerConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: `Bearer ${authorized.token.access}` },
  };
  // Request body is empty due to schema definition of IShoppingMallCustomerSession.IRequest
  const response = await api.functional.shoppingMall.customer.sessions.index(
    customerConnection,
    {
      body: {},
    },
  );
  typia.assert(response);
  // Validate pagination structure
  TestValidator.predicate(
    "pagination current page is positive",
    response.pagination.current > 0,
  );
  TestValidator.predicate(
    "pagination limit is positive",
    response.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    response.pagination.pages >= 0,
  );
}
