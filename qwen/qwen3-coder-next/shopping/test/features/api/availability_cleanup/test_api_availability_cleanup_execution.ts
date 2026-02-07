import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallInventoryHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryHistory";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_availability_cleanup_execution(
  connection: api.IConnection,
): Promise<void> {
  // Create customer-specific connection for authentication
  const customerConnection: api.IConnection = { host: connection.host };
  // Register and login as a customer
  const customerToken = await authorize_customer_join(customerConnection, {
    body: typia.random<IShoppingMallCustomer.IJoin>(),
  });
  typia.assert(customerToken);
  // Create new connection with updated headers from login
  const authenticatedConnection: api.IConnection = { host: connection.host };
  authenticatedConnection.headers = {
    authorization: `Bearer ${customerToken.token.access}`,
  };
  // Execute the availability cleanup operation
  const result =
    await api.functional.shoppingMall.customer.availability_cleanup.cleanupAvailability(
      authenticatedConnection,
      {
        body: typia.random<IShoppingMallInventoryHistory.ICleanupRequest>(),
      },
    );
  typia.assert(result);
}
