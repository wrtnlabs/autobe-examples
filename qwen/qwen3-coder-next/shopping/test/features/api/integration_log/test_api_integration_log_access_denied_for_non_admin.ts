import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallIntegrationLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallIntegrationLog";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

/**
 * Test access denial when non-admin users attempt to retrieve integration logs.
 * First, register a customer account using /auth/customer/join, then log in
 * to obtain customer authentication tokens. With these tokens, call the
 * integration log endpoint with a valid logId. Verify that the operation
 * returns an access denied error and does not expose the log data, as integration
 * logs are admin-only resources.
 */
export async function test_api_integration_log_access_denied_for_non_admin(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create customer account
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.MinLength<1> & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      name: RandomGenerator.name(),
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  // 2. Login as customer
  const customerLogin = await authorize_customer_login(customerConnection, {
    body: {
      email: (customerConnection.headers?.["Authorization"] as string) ?? "",
      password: "",
      href: "http://localhost:3000/customer/login",
      referrer: "http://localhost:3000",
    } satisfies IEcommerceMallCustomer.ILogin,
  });
  typia.assert(customerLogin);
  customerConnection.headers = { Authorization: customerLogin.token.access };
  // 3. Try to access integration log endpoint without admin privileges
  const logId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error("access denied for non-admin", async () => {
    await api.functional.ecommerceMall.admin.integration_logs.at(
      customerConnection,
      {
        logId,
      },
    );
  });
}
