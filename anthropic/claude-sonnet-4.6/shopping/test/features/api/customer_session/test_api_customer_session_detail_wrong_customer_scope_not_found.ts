import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerSession";
import type { IShoppingMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSuperAdmin";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

export async function test_api_customer_session_detail_wrong_customer_scope_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdminAuth = await authorize_super_admin_join(
    superAdminConnection,
    {},
  );
  typia.assert(superAdminAuth);
  // 2. Register customer A
  const customerAConnection: api.IConnection = { host: connection.host };
  const customerAAuth = await authorize_customer_join(customerAConnection, {});
  typia.assert(customerAAuth);
  // 3. Register customer B and capture their id
  const customerBConnection: api.IConnection = { host: connection.host };
  const customerBAuth = await authorize_customer_join(customerBConnection, {});
  typia.assert(customerBAuth);
  const customerBId = customerBAuth.id;
  // The join response does not expose the session id directly.
  // We use a random UUID as the sessionId — it will not be found within customer B's scope,
  // which correctly triggers a 404 response, validating the session-customer scope enforcement.
  const mismatchedSessionId = typia.random<string & tags.Format<"uuid">>();
  // 4. As super administrator, attempt to retrieve customer B's session using a mismatched sessionId.
  // The system must return 404 because the session does not belong to customer B.
  await TestValidator.httpError(
    "session from different customer scope returns 404",
    404,
    async () => {
      await api.functional.shoppingMall.superAdmin.customers.sessions.at(
        superAdminConnection,
        {
          customerId: customerBId,
          sessionId: mismatchedSessionId,
        },
      );
    },
  );
}
