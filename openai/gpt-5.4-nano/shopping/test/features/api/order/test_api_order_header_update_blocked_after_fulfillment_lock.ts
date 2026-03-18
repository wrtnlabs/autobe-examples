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
import type { IShoppingMallShipmentConfirmation } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipmentConfirmation";
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
import { generate_random_shopping_mall_member_shipments_confirmations_create } from "../../../generate/generate_random_shopping_mall_member_shipments_confirmations_create";
import { generate_random_shopping_mall_member_shipments_create } from "../../../generate/generate_random_shopping_mall_member_shipments_create";
import { prepare_random_shopping_mall_order } from "../../../prepare/prepare_random_shopping_mall_order";
import { prepare_random_shopping_mall_shipment } from "../../../prepare/prepare_random_shopping_mall_shipment";
import { prepare_random_shopping_mall_shipment_confirmation } from "../../../prepare/prepare_random_shopping_mall_shipment_confirmation";

export async function test_api_order_header_update_blocked_after_fulfillment_lock(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Password_123456!" satisfies string & tags.Format<"password">,
    } satisfies IShoppingMallMember.IJoin,
  });

  const order = await generate_random_shopping_mall_member_orders_create(
    memberConnection,
    {},
  );
  typia.assert(order);

  const before = await api.functional.shoppingMall.member.orders.at(
    memberConnection,
    { orderId: order.id },
  );
  typia.assert(before);

  const beforeShipTo = {
    ship_to_name: before.ship_to_name,
    ship_to_phone: before.ship_to_phone,
    ship_to_postal_code: before.ship_to_postal_code,
    ship_to_region: before.ship_to_region,
    ship_to_city: before.ship_to_city,
    ship_to_street_address: before.ship_to_street_address,
    ship_to_detail_address: before.ship_to_detail_address,
    shipping_instructions: before.shipping_instructions,
  };

  const shipment = await generate_random_shopping_mall_member_shipments_create(
    memberConnection,
    {
      body: {
        shopping_mall_order_id: order.id,
        shopping_mall_order_item_ids: order.orderItems.map((item) => item.id),
        shipment_confirmation: null,
      } satisfies IShoppingMallShipment.ICreate,
    },
  );
  typia.assert(shipment);

  const confirmation =
    await generate_random_shopping_mall_member_shipments_confirmations_create(
      memberConnection,
      {
        params: { shipmentId: shipment.id },
        body: {
          confirmedAt: new Date().toISOString(),
        },
      },
    );
  typia.assert(confirmation);

  const attemptedCity = typia.random<string>();
  const updatePayload = {
    ship_to_city: attemptedCity,
  } satisfies IShoppingMallOrder.IUpdate;

  await TestValidator.error(
    "order header update should be blocked after fulfillment lock",
    async () => {
      await api.functional.shoppingMall.member.orders.update(memberConnection, {
        orderId: order.id,
        body: updatePayload,
      });
    },
  );

  const after = await api.functional.shoppingMall.member.orders.at(
    memberConnection,
    { orderId: order.id },
  );
  typia.assert(after);

  TestValidator.equals(
    "ship_to_name unchanged",
    after.ship_to_name,
    beforeShipTo.ship_to_name,
  );
  TestValidator.equals(
    "ship_to_phone unchanged",
    after.ship_to_phone,
    beforeShipTo.ship_to_phone,
  );
  TestValidator.equals(
    "ship_to_postal_code unchanged",
    after.ship_to_postal_code,
    beforeShipTo.ship_to_postal_code,
  );
  TestValidator.equals(
    "ship_to_region unchanged",
    after.ship_to_region,
    beforeShipTo.ship_to_region,
  );
  TestValidator.equals(
    "ship_to_city unchanged",
    after.ship_to_city,
    beforeShipTo.ship_to_city,
  );
  TestValidator.equals(
    "ship_to_street_address unchanged",
    after.ship_to_street_address,
    beforeShipTo.ship_to_street_address,
  );
  TestValidator.equals(
    "ship_to_detail_address unchanged",
    after.ship_to_detail_address,
    beforeShipTo.ship_to_detail_address,
  );
  TestValidator.equals(
    "shipping_instructions unchanged",
    after.shipping_instructions,
    beforeShipTo.shipping_instructions,
  );

  const itemStatus =
    await api.functional.shoppingMall.member.orders.order_items.status.orderItemsStatus(
      memberConnection,
      { orderId: order.id },
    );
  typia.assert(itemStatus);
  TestValidator.equals(
    "order item belongs to the same order",
    itemStatus.shoppingMallOrderId,
    order.id,
  );
}
