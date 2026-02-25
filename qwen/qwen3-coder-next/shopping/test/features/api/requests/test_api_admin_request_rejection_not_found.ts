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

export async function test_api_admin_request_rejection_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin connection for authorization
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphabets(12),
    } satisfies IShoppingMallAdmin.IJoin,
  });
  // 2. Test rejection with non-existent request ID
  // Should return 404 not found error
  await TestValidator.error(
    "non-existent request rejection should fail",
    async () => {
      await api.functional.shoppingMall.admin.admin.requests.reject(
        adminConnection,
        {
          requestId: "00000000-0000-0000-0000-000000000000",
          body: {
            date: new Date().toISOString().split("T")[0],
            total_sales_amount: 0,
            order_count: 0,
          } satisfies IShoppingMallSystemConfiguration,
        },
      );
    },
  );
}
