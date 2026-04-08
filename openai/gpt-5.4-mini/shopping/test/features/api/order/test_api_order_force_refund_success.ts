import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministrator";
import type { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import type { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import type { IMallPlatformOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrder";
import type { IMallPlatformOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrderItem";
import type { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import type { IMallPlatformProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductImage";
import type { IMallPlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariant";
import type { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import type { IMallPlatformShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformShipment";
import type { IMallPlatformShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformShipmentItem";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_order_force_refund_success(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test administrator force-refund intervention on an order.
   *
   * This validates that an authenticated administrator can invoke the order
   * force-refund operation and receive a complete order representation that
   * preserves historical data while reflecting refund-side side effects.
   *
   * 1. Authenticate a fresh administrator using the provided join utility.
   * 2. Call the force-refund endpoint for an order identifier.
   * 3. Verify the returned order payload and refunded item state.
   */
  const administratorConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(administratorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies IMallPlatformAdministrator.IJoin,
  });
  const order =
    await api.functional.mallPlatform.administrator.orders.force_refund.create(
      administratorConnection,
      {
        orderId: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  typia.assert(order);
  TestValidator.predicate(
    "returned order should contain at least one refunded item",
    order.orderItems.some((item) => item.status === "refunded"),
  );
  TestValidator.predicate(
    "order history fields should remain present after force refund",
    order.id.length > 0 &&
      order.orderNumber.length > 0 &&
      order.createdAt.length > 0,
  );
  TestValidator.predicate(
    "nested order item relations should be preserved",
    order.orderItems.every(
      (item) =>
        item.order.id === order.id &&
        item.seller.id.length > 0 &&
        item.productVariant.id.length > 0 &&
        item.productVariant.product.id.length > 0,
    ),
  );
}
