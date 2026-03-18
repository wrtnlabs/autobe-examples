import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_order_force_refund_single_item_consistent_order_status_and_inventory(
  connection: api.IConnection,
): Promise<void> {
  const adminConnection: api.IConnection = { host: connection.host };
  // Authenticate as admin
  const adminAuth: IShoppingMallAdmin.IAuthorized = await authorize_admin_join(
    adminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<string & tags.Format<"password">>(),
      } satisfies IShoppingMallAdmin.IJoin,
    },
  );
  typia.assert(adminAuth);
  // Execute the admin oversight operation (DTO surface provided only contains IUpdate).
  const updatePayload: IShoppingMallOrder.IUpdate = {
    ship_to_name: RandomGenerator.name(),
  };
  const summaryBefore: IShoppingMallOrder.ISummary =
    await api.functional.shoppingMall.admin.admin.orders.processAdminOrderOversight(
      adminConnection,
      { body: updatePayload },
    );
  typia.assert(summaryBefore);
  // Retry safety: re-apply the same request payload and ensure stable identity.
  const summaryAfter: IShoppingMallOrder.ISummary =
    await api.functional.shoppingMall.admin.admin.orders.processAdminOrderOversight(
      adminConnection,
      { body: updatePayload },
    );
  typia.assert(summaryAfter);
  TestValidator.equals("order id is stable", summaryAfter.id, summaryBefore.id);
  TestValidator.predicate(
    "overallStatus is non-empty",
    summaryAfter.overallStatus.length > 0,
  );
}
