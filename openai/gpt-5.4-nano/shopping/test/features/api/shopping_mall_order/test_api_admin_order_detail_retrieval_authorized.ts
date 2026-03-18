import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallPayment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPayment";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_admin_order_detail_retrieval_authorized(
  connection: api.IConnection,
): Promise<void> {
  const adminConnection: api.IConnection = { host: connection.host };
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IShoppingMallAdmin.IJoin,
  });
  // Note: the environment should ideally provide an existing accessible orderId.
  // Without a fixture variable in the given template scope, we fall back to a UUID.
  const existingOrderId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // Scenario A: authorized admin success
  const order = await api.functional.shoppingMall.admin.admin.orders.at(
    adminConnection,
    {
      orderId: existingOrderId,
    },
  );
  typia.assert(order);
  TestValidator.predicate("orderItems is an array", () =>
    Array.isArray(order.orderItems),
  );
  TestValidator.predicate("shipments is an array", () =>
    Array.isArray(order.shipments),
  );
  for (const item of order.orderItems) {
    TestValidator.equals(
      "orderItem.shopping_mall_order_id matches orderId",
      item.shopping_mall_order_id,
      existingOrderId,
    );
  }
  for (const shipment of order.shipments) {
    TestValidator.equals(
      "shipment.order.id matches orderId",
      shipment.order.id,
      existingOrderId,
    );
  }
  // Scenario B: non-existent orderId -> 404
  const nonExistentOrderId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  await TestValidator.httpError(
    "admin order detail not found",
    404,
    async () => {
      await api.functional.shoppingMall.admin.admin.orders.at(adminConnection, {
        orderId: nonExistentOrderId,
      });
    },
  );
  // Scenario C: non-admin denied
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IShoppingMallMember.IJoin,
  });
  await TestValidator.httpError(
    "member cannot access admin order detail",
    [401, 403],
    async () => {
      await api.functional.shoppingMall.admin.admin.orders.at(
        memberConnection,
        {
          orderId: existingOrderId,
        },
      );
    },
  );
}
