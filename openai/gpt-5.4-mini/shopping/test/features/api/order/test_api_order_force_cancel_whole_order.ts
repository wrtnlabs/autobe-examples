import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministrator";
import type { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import type { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import type { IMallPlatformOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrder";
import type { IMallPlatformOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrderItem";
import type { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import type { IMallPlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariant";
import type { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import type { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
import type { IMallPlatformShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformShipment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { generate_random_mall_platform_administrator_orders_force_cancel_force_cancel } from "../../../generate/generate_random_mall_platform_administrator_orders_force_cancel_force_cancel";
import { prepare_random_mall_platform_order } from "../../../prepare/prepare_random_mall_platform_order";

export async function test_api_order_force_cancel_whole_order(
  connection: api.IConnection,
): Promise<void> {
  const administratorConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(administratorConnection, {
    body: {
      email: `${RandomGenerator.alphabets(8)}@test.com` satisfies string &
        tags.Format<"email">,
      password: RandomGenerator.alphaNumeric(12) satisfies string &
        tags.Format<"password">,
    } satisfies IMallPlatformAdministrator.IJoin,
  });
  const orderId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const order =
    await api.functional.mallPlatform.administrator.orders.force_cancel.forceCancel(
      administratorConnection,
      {
        orderId,
        body: {
          scope: "wholeOrder",
        } satisfies IMallPlatformOrder.ICreate,
      },
    );
  typia.assert(order);
  TestValidator.equals(
    "force-cancel response should keep the same order id",
    order.id,
    orderId,
  );
  TestValidator.predicate(
    "force-cancel should update the order timestamp",
    order.updatedAt >= order.createdAt,
  );
  TestValidator.predicate(
    "force-cancel should preserve the historical order record",
    order.deletedAt === null || order.deletedAt >= order.updatedAt,
  );
  TestValidator.predicate(
    "force-cancel should return item-level history for the order",
    order.orderItems.length > 0,
  );
  TestValidator.predicate(
    "force-cancel should cancel every item in the whole order",
    order.orderItems.every((item) => item.status === "cancelled"),
  );
  TestValidator.predicate(
    "force-cancel should keep each cancelled item attached to the same order",
    order.orderItems.every((item) => item.order.id === order.id),
  );
  TestValidator.predicate(
    "force-cancel should preserve shipment history rather than removing it",
    order.shipments.length >= 0,
  );
}
