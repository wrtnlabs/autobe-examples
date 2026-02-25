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

export async function test_api_customer_sessions_access_control_enforcement(
  connection: api.IConnection,
): Promise<void> {
  // This test scenario verifies that unauthorized users are denied access when attempting to retrieve customer sessions.
  // It attempts to call the endpoint without admin authentication to confirm access control enforcement.
  // It also attempts with authenticated customer user credentials to verify the role-based permission rules.
  // It ensures that proper error responses (e.g., 403 Forbidden) are returned for unauthorized access attempts.
  // This guards against data leaks and ensures compliance with security policies.
  // 1. Base call without any authentication should reject access
  await TestValidator.httpError(
    "unauthenticated access rejected",
    403,
    async () => {
      await api.functional.shoppingMall.customer.sessions.index(connection, {
        body: {},
      });
    },
  );
  // 2. Join a customer to get authenticated customer connection
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {},
  });
  customerConnection.headers = { Authorization: customer.token.access };
  // 3. Attempt to call index endpoint with authenticated customer connection should reject access
  await TestValidator.httpError(
    "customer role access rejected",
    403,
    async () => {
      await api.functional.shoppingMall.customer.sessions.index(
        customerConnection,
        {
          body: {},
        },
      );
    },
  );
}
