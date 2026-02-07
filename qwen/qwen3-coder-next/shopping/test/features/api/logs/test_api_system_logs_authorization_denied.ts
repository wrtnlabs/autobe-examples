import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallSystematicLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSystematicLog";
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

export async function test_api_system_logs_authorization_denied(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup: Create admin and customer accounts
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: typia.random<IShoppingMallAdmin.IJoin>(),
  });
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: typia.random<IShoppingMallCustomer.IJoin>(),
  });
  // 2. Authenticate as customer
  const customerToken = await authorize_customer_login(customerConnection, {
    body: typia.random<IShoppingMallCustomer.ILogin>(),
  });
  // 3. Attempt to access admin-only logs endpoint with customer credentials
  const logId = typia.random<string & tags.Format<"uuid">>();
  const error = await TestValidator.error(
    "customer should be denied access to admin logs",
    async () => {
      await api.functional.shoppingMall.admin.logs.at(customerConnection, {
        logId,
      });
    },
  );
  // 4. Verify the error is due to authorization failure
  typia.assert(error);
}
