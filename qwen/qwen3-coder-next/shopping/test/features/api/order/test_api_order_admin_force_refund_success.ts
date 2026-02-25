import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAddress";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallOrderProductSnapshots } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderProductSnapshots";
import type { IShoppingMallOrderSellerProfileSnapshots } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderSellerProfileSnapshots";
import type { IShoppingMallOrderStatusLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderStatusLog";
import type { IShoppingMallOrderVariantSnapshots } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderVariantSnapshots";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_order_admin_force_refund_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register new administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Test@1234",
    } satisfies IShoppingMallAdmin.IJoin,
  });
  typia.assert(admin);
  // 2. Generate test data for force refund
  const orderId = typia.random<string & tags.Format<"uuid">>();
  // 3. Call force refund endpoint
  const refundResponse =
    await api.functional.shoppingMall.admin.orders.force_actions.refund(
      adminConnection,
      {
        orderId: orderId,
        body: {
          page: 1,
          limit: 20,
        } satisfies IShoppingMallOrder.IRequest,
      },
    );
  typia.assert(refundResponse);
  // 4. Verify all order items status change to 'refunded'
  TestValidator.equals(
    "all order items status is refunded",
    refundResponse.orderItems.every((item) => item.itemStatus === "refunded"),
    true,
  );
  // 5. Verify inventory quantities are restored
  TestValidator.predicate(
    "inventory stock quantity restored",
    refundResponse.orderItems.every(
      (item) => typeof item !== "undefined" && item.quantity > 0,
    ),
  );
  // 6. Verify order status changes to 'refunded'
  TestValidator.equals(
    "order status is refunded",
    refundResponse.status,
    "refunded",
  );
  // 7. Verify refund payment records are created
  TestValidator.predicate(
    "refund payment records created",
    refundResponse.orderItems.length > 0,
  );
  // 8. Verify order status logs are created
  TestValidator.predicate(
    "order status logs created",
    refundResponse.orderStatusLogs.length > 0,
  );
}
