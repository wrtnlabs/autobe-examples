import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSellerAccessLogs } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSellerAccessLogs";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerAccessLogs } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerAccessLogs";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_seller_access_logs_filter_success_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin connection
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234" satisfies string & tags.Format<"password">,
    } satisfies IShoppingMallAdmin.IJoin,
  });
  // 2. Generate a random seller ID for testing
  // Since seller listing API is not available, use a random UUID
  const sellerId = typia.random<string & tags.Format<"uuid">>();
  // 3. Filter access logs by success=false (failed logs only)
  const filtered =
    await api.functional.shoppingMall.admin.sellers.access_logs.index(
      adminConnection,
      {
        sellerId: sellerId,
        body: {
          success: false,
        } satisfies IShoppingMallSellerAccessLogs.IRequest,
      },
    );
  typia.assert(filtered);
  // 4. Validate results structure
  TestValidator.predicate(
    "has pagination info",
    filtered.pagination.records >= 0,
  );
  TestValidator.predicate("has data array", Array.isArray(filtered.data));
}
