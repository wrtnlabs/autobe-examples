import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerAddress";
import type { IEcommerceMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallMember";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
import type { IEcommerceMallShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipmentItem";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_ecommerce_mall_member_orders_create } from "../../../generate/generate_random_ecommerce_mall_member_orders_create";
import { prepare_random_ecommerce_mall_order } from "../../../prepare/prepare_random_ecommerce_mall_order";
import { prepare_random_ecommerce_mall_order_item } from "../../../prepare/prepare_random_ecommerce_mall_order_item";

export async function test_api_shipment_delivery_confirmation_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register customer account
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(memberAuth);
  // 2. Create order with items
  const orderConnection: api.IConnection = { host: connection.host };
  orderConnection.headers = {
    Authorization: memberAuth.token.access,
  };
  const order = await generate_random_ecommerce_mall_member_orders_create(
    orderConnection,
    { body: undefined },
  );
  typia.assert(order);
  // 3. Get first shipment from order
  TestValidator.predicate(
    "order has at least one shipment",
    () => order.shipments.length > 0,
  );
  const shipment = order.shipments[0];
  typia.assert(shipment);
  // Validate shipment is in shipped status before confirmation
  TestValidator.equals(
    "shipment initial status is shipped",
    shipment.status,
    "shipped",
  );
  // 4. Confirm delivery
  const deliveryConnection: api.IConnection = { host: connection.host };
  deliveryConnection.headers = {
    Authorization: memberAuth.token.access,
  };
  const deliveredShipment =
    await api.functional.ecommerceMall.member.shipments.confirm_delivery.confirmDelivery(
      deliveryConnection,
      { shipmentId: shipment.id },
    );
  typia.assert(deliveredShipment);
  // 5. Validate response
  TestValidator.equals(
    "shipment status updated to delivered",
    deliveredShipment.status,
    "delivered",
  );
  TestValidator.predicate(
    "delivered_at timestamp is set",
    () => deliveredShipment.delivered_at !== null,
  );
  TestValidator.predicate(
    "delivered_at is valid date",
    () =>
      deliveredShipment.delivered_at !== null &&
      new Date(deliveredShipment.delivered_at).getTime() > 0,
  );
  TestValidator.equals(
    "shipment has items",
    deliveredShipment.shipment_items.length > 0,
    true,
  );
  TestValidator.equals(
    "all shipment items are delivered",
    deliveredShipment.shipment_items.every(
      (item) => item.status === "delivered",
    ),
    true,
  );
}
