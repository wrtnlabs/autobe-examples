import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallInventoryLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallInventoryLog";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallInventoryLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryLog";
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

export async function test_api_inventory_history_unauthorized_access(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin account
  const adminConnection: api.IConnection = { host: connection.host };
  const adminJoinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
  } satisfies IShoppingMallAdmin.IJoin;
  const adminInfo = await authorize_admin_join(adminConnection, {
    body: adminJoinInput,
  });
  typia.assert(adminInfo);
  // 2. Login as admin
  const adminLoginInfo = await authorize_admin_login(adminConnection, {
    body: {
      email: adminJoinInput.email,
      password: adminJoinInput.password,
    },
  });
  typia.assert(adminLoginInfo);
  // 3. Create customer account
  const customerConnection: api.IConnection = { host: connection.host };
  const customerJoinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
  } satisfies IShoppingMallCustomer.IJoin;
  const customerInfo = await authorize_customer_join(customerConnection, {
    body: customerJoinInput,
  });
  typia.assert(customerInfo);
  // 4. Login as customer
  const customerLoginInfo = await authorize_customer_login(customerConnection, {
    body: {
      email: customerJoinInput.email,
      password: customerJoinInput.password,
    },
  });
  typia.assert(customerLoginInfo);
  // 5. Create a valid variantId using random UUID
  // We don't need a real product/variant because we're testing authorization, not data access
  // The server will reject the request with 403 due to authorization level regardless of variantId existence
  const variantId = typia.random<string & tags.Format<"uuid">>();
  // 6. Customer attempts to access admin-only inventory history endpoint - this should fail with 403
  await TestValidator.httpError(
    "Customer cannot access admin inventory history endpoint",
    403,
    async () => {
      await api.functional.shoppingMall.admin.inventory.history.index(
        customerConnection,
        {
          variantId: variantId,
        },
      );
    },
  );
}
