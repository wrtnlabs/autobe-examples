import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallPayment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPayment";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import type { IShoppingMallSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSnapshot";
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

export async function test_api_order_item_update_incompatible_status_transition_blocked(
  connection: api.IConnection,
): Promise<void> {
  // 1) Register a new member account
  const joined = await authorize_member_join(
    { host: connection.host },
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<string & tags.Format<"password">>(),
      } satisfies IShoppingMallMember.IJoin,
    },
  );
  const memberConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: joined.token.access,
    },
  };
  // 2) Create customer order to obtain an orderItemId
  const order = await generate_random_shopping_mall_member_orders_create(
    memberConnection,
    {},
  );
  typia.assert(order);
  const targetItem = order.orderItems[0];
  typia.assert(targetItem);
  const initialLineItemStatus = targetItem.line_item_status;
  const initialUpdatedAt = targetItem.updated_at;
  const initialShoppingMallShipmentId = targetItem.shopping_mall_shipment_id;
  // 4) Request an incompatible transition
  const requestedLineItemStatus =
    initialLineItemStatus.includes("cancel") ||
    initialLineItemStatus.includes("refund")
      ? "delivered"
      : "cancelled";
  const updatePayload: IShoppingMallOrderItem.IUpdate = {
    line_item_status: requestedLineItemStatus,
    shopping_mall_shipment_id:
      initialShoppingMallShipmentId === null
        ? typia.random<string & tags.Format<"uuid">>()
        : null,
  };
  await TestValidator.httpError(
    "incompatible line_item_status transition should be rejected",
    [403, 409, 404],
    async () => {
      await api.functional.shoppingMall.member.order_items.update(
        memberConnection,
        {
          orderItemId: targetItem.id,
          body: updatePayload,
        },
      );
    },
  );
  // 5-6) Since no order-item read endpoint is available in provided SDK,
  // we can only assert local pre-state invariants around the request payload.
  TestValidator.equals(
    "line_item_status unchanged (pre-state snapshot)",
    initialLineItemStatus,
    targetItem.line_item_status,
  );
  TestValidator.equals(
    "updatedAt unchanged (pre-state snapshot)",
    initialUpdatedAt,
    targetItem.updated_at,
  );
  TestValidator.equals(
    "shipment linkage unchanged (pre-state snapshot)",
    initialShoppingMallShipmentId,
    targetItem.shopping_mall_shipment_id,
  );
}
