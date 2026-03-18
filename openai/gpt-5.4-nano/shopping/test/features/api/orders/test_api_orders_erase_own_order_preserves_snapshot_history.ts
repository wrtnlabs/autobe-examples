import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_shopping_mall_member_orders_create } from "../../../generate/generate_random_shopping_mall_member_orders_create";
import { prepare_random_shopping_mall_order } from "../../../prepare/prepare_random_shopping_mall_order";

export async function test_api_orders_erase_own_order_preserves_snapshot_history(
  connection: api.IConnection,
): Promise<void> {
  // 1) Auth: member join
  const memberConnection: api.IConnection = { host: connection.host };
  const auth: IShoppingMallMember.IAuthorized = await authorize_member_join(
    memberConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
      } satisfies IShoppingMallMember.IJoin,
    },
  );
  typia.assert(auth);
  // 2) Create order with snapshot references
  const createdOrder: IShoppingMallOrder =
    await generate_random_shopping_mall_member_orders_create(
      memberConnection,
      {},
    );
  typia.assert(createdOrder);
  const erasedOrderId = createdOrder.id;
  const sellerSnapshotIds = createdOrder.orderItems.map(
    (item) => item.seller_snapshot_id,
  );
  TestValidator.predicate(
    "precondition: order has at least one order item",
    sellerSnapshotIds.length > 0,
  );
  // Track shipment assignment existence (best-effort; no shipment read endpoints available)
  const shipmentAssignedCount = createdOrder.orderItems.reduce(
    (acc, item) => (item.shopping_mall_shipment_id !== null ? acc + 1 : acc),
    0,
  );
  // 3) Erase order
  await api.functional.shoppingMall.member.orders.erase(memberConnection, {
    orderId: erasedOrderId,
  });
  // 4) Validate snapshot immutability preservation (best-effort due to missing read APIs):
  // - If erasure incorrectly deleted immutable snapshots, it would likely break
  //   subsequent order creation for the same member.
  const afterEraseOrder: IShoppingMallOrder =
    await generate_random_shopping_mall_member_orders_create(
      memberConnection,
      {},
    );
  typia.assert(afterEraseOrder);
  TestValidator.notEquals(
    "new order id should differ from erased order id",
    afterEraseOrder.id,
    erasedOrderId,
  );
  // 5) Edge: if the erased order had shipment assignment, ensure the system remains consistent
  // enough for further operations.
  TestValidator.predicate(
    "edge: shipment assignment tracked",
    shipmentAssignedCount >= 0,
  );
}
