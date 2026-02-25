import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallOrderProductSnapshots } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderProductSnapshots";
import type { IShoppingMallOrderSellerProfileSnapshots } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderSellerProfileSnapshots";
import type { IShoppingMallOrderVariantSnapshots } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderVariantSnapshots";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_force_cancel_order_item_already_cancelled(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin account for testing
  const adminConnection: api.IConnection = { host: connection.host };
  const adminCredential: IShoppingMallAdmin.IJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "1234!@#$",
  };
  const admin: IShoppingMallAdmin.IAuthorized = await authorize_admin_join(
    adminConnection,
    {
      body: adminCredential,
    },
  );
  typia.assert(admin);
  // Create admin connection with token
  const adminWithToken: api.IConnection = {
    host: adminConnection.host,
    headers: {
      Authorization: admin.token.access,
    },
  };
  // Step 2: Use a scenario that simulates an already cancelled item
  // Generate random UUIDs for order and item
  const orderId: string = typia.random<string & tags.Format<"uuid">>();
  const itemId: string = typia.random<string & tags.Format<"uuid">>();
  // First force cancellation
  const firstForceCancelRequest: IShoppingMallOrderItem.IForceCancelRequest = {
    reason: "Initial force cancellation",
  };
  const firstCancelledItem: IShoppingMallOrderItem =
    await api.functional.shoppingMall.admin.orders.items.force_actions.cancel.forceCancel(
      adminWithToken,
      {
        orderId: orderId,
        itemId: itemId,
        body: firstForceCancelRequest,
      },
    );
  typia.assert(firstCancelledItem);
  // Verify first cancellation succeeded
  TestValidator.equals(
    "first force cancel should succeed",
    firstCancelledItem.itemStatus,
    "cancelled",
  );
  // Step 3: Attempt to force cancel the same already-cancelled item
  // This should fail with a conflict error
  const secondForceCancelRequest: IShoppingMallOrderItem.IForceCancelRequest = {
    reason: "Attempt to cancel already cancelled item",
  };
  // Expect this to throw an error because the item is already cancelled
  await TestValidator.error("force cancel already cancelled item", async () => {
    await api.functional.shoppingMall.admin.orders.items.force_actions.cancel.forceCancel(
      adminWithToken,
      {
        orderId: orderId,
        itemId: itemId,
        body: secondForceCancelRequest,
      },
    );
  });
}
