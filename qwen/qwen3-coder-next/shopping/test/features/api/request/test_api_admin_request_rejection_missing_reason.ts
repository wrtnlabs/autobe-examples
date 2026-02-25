import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallSystemConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSystemConfiguration";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test administrator request rejection with missing rejection reason.
 * Verifies that the rejection operation fails when no rejection reason is provided.
 */
export async function test_api_admin_request_rejection_missing_reason(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin connection
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
    } satisfies IShoppingMallAdmin.IJoin,
  });
  // 2. Create another admin to submit administrator request
  const requesterConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(requesterConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
    } satisfies IShoppingMallAdmin.IJoin,
  });
  // 3. Try to reject the request without providing rejection reason
  // This should fail because rejection_reason is required in the request body
  await TestValidator.error("missing rejection reason", async () => {
    await api.functional.shoppingMall.admin.admin.requests.reject(
      adminConnection,
      {
        requestId: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
        body: {
          date: new Date().toISOString().split("T")[0],
          total_sales_amount: 1000,
          order_count: 5,
        } satisfies IShoppingMallSystemConfiguration,
      },
    );
  });
}
