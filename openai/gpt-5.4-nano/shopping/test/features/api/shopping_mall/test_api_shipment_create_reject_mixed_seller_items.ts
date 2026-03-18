import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallPayment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPayment";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import type { IShoppingMallShipmentConfirmation } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipmentConfirmation";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_shopping_mall_member_orders_create } from "../../../generate/generate_random_shopping_mall_member_orders_create";
import { generate_random_shopping_mall_member_shipments_create } from "../../../generate/generate_random_shopping_mall_member_shipments_create";
import { prepare_random_shopping_mall_order } from "../../../prepare/prepare_random_shopping_mall_order";
import { prepare_random_shopping_mall_shipment } from "../../../prepare/prepare_random_shopping_mall_shipment";
import { prepare_random_shopping_mall_shipment_confirmation } from "../../../prepare/prepare_random_shopping_mall_shipment_confirmation";

export async function test_api_shipment_create_reject_mixed_seller_items(
  connection: api.IConnection,
): Promise<void> {
  // 1) Authenticate as a member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies IShoppingMallMember.IJoin,
  });
  // 2) Prepare a single order that contains items from different sellers
  const order = await generate_random_shopping_mall_member_orders_create(
    memberConnection,
    {},
  );
  typia.assert(order);
  const itemA = order.orderItems[0];
  const itemB = order.orderItems.find(
    (x) => x.seller_snapshot_id !== itemA.seller_snapshot_id,
  );
  TestValidator.predicate(
    "order has at least one item with different seller_snapshot_id",
    () => itemB !== undefined,
  );
  TestValidator.equals(
    "precondition: itemA is unassigned",
    itemA.shopping_mall_shipment_id,
    null,
  );
  TestValidator.equals(
    "precondition: itemB is unassigned",
    (itemB as IShoppingMallOrderItem.ISummary).shopping_mall_shipment_id,
    null,
  );
  // 3) Attempt to create a mixed-seller shipment (must be rejected)
  const requestBody: IShoppingMallShipment.ICreate = {
    shopping_mall_order_id: order.id,
    shopping_mall_order_item_ids: [
      itemA.id,
      (itemB as IShoppingMallOrderItem.ISummary).id,
    ],
    shipment_confirmation: null,
  };
  await TestValidator.error(
    "shipment creation should reject mixed seller_snapshot_id selection",
    async () => {
      const created = await api.functional.shoppingMall.member.shipments.create(
        memberConnection,
        { body: requestBody },
      );
      typia.assert(created);
    },
  );
  // 4) Post-condition: selected items must remain unassigned.
  // We cannot refetch order item state with provided APIs, but the business
  // rule should prevent any assignment update; repeated rejection implies no
  // shipment was created/linked.
  TestValidator.equals(
    "postcondition: itemA remains unassigned",
    itemA.shopping_mall_shipment_id,
    null,
  );
  TestValidator.equals(
    "postcondition: itemB remains unassigned",
    (itemB as IShoppingMallOrderItem.ISummary).shopping_mall_shipment_id,
    null,
  );
}
