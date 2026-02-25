import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import type { IEcommerceOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrder";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceOrder";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_order_history_empty(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create customer connection and authenticate using utility function
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
    } satisfies IEcommerceCustomer.IJoin,
  });
  // 2. Call order history with empty body (no parameters)
  const response = await api.functional.ecommerce.customer.orders.history.index(
    customerConnection,
    {
      body: {} satisfies IEcommerceOrder.IRequest,
    },
  );
  typia.assert(response);
  // 3. Validate pagination metadata for empty result set
  TestValidator.equals(
    "pagination.current should be 1",
    response.pagination.current,
    1,
  );
  TestValidator.predicate(
    "pagination.limit should be positive",
    response.pagination.limit > 0,
  );
  TestValidator.equals(
    "pagination.records should be 0",
    response.pagination.records,
    0,
  );
  TestValidator.equals(
    "pagination.pages should be 0",
    response.pagination.pages,
    0,
  );
  // 4. Validate empty data array
  TestValidator.equals("data should be empty array", response.data.length, 0);
  TestValidator.predicate(
    "data should be empty",
    () => Array.isArray(response.data) && response.data.length === 0,
  );
}
