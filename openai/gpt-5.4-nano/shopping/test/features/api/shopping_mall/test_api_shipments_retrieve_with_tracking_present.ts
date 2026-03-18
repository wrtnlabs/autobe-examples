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
import { generate_random_shopping_mall_member_shipments_confirmations_create } from "../../../generate/generate_random_shopping_mall_member_shipments_confirmations_create";
import { generate_random_shopping_mall_member_shipments_create } from "../../../generate/generate_random_shopping_mall_member_shipments_create";
import { prepare_random_shopping_mall_order } from "../../../prepare/prepare_random_shopping_mall_order";
import { prepare_random_shopping_mall_shipment } from "../../../prepare/prepare_random_shopping_mall_shipment";
import { prepare_random_shopping_mall_shipment_confirmation } from "../../../prepare/prepare_random_shopping_mall_shipment_confirmation";

export async function test_api_shipments_retrieve_with_tracking_present(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = RandomGenerator.alphaNumeric(16);

  await authorize_member_join(memberConnection, {
    body: {
      email: memberEmail,
      password: memberPassword,
    } satisfies IShoppingMallMember.IJoin,
  });

  const order = await generate_random_shopping_mall_member_orders_create(
    memberConnection,
    {},
  );
  typia.assert(order);

  const shipment = await generate_random_shopping_mall_member_shipments_create(
    memberConnection,
    {
      body: {
        shopping_mall_order_id: order.id,
        shopping_mall_order_item_ids: order.orderItems.map((oi) => oi.id),
        shipment_confirmation: null,
      } satisfies IShoppingMallShipment.ICreate,
    },
  );
  typia.assert(shipment);

  const confirmationType = RandomGenerator.pick([
    "shipped",
    "delivered",
    "out_for_delivery",
  ] as const);
  const confirmedAt = new Date().toISOString();
  const trackingUrl = typia.random<string & tags.Format<"url">>();
  const carrierName = RandomGenerator.name();
  const trackingNumber = typia.random<string>();

  const confirmation =
    await generate_random_shopping_mall_member_shipments_confirmations_create(
      memberConnection,
      {
        params: { shipmentId: shipment.id },
        body: {
          shoppingMallShipmentId: shipment.id,
          confirmationType,
          confirmedAt,
          trackingUrl,
          trackingNumber,
          carrierName,
          note: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IShoppingMallShipmentConfirmation.ICreate,
      },
    );
  typia.assert(confirmation);

  const retrieved = await api.functional.shoppingMall.member.shipments.at(
    memberConnection,
    { shipmentId: shipment.id },
  );
  typia.assert(retrieved);

  TestValidator.equals(
    "shipment id matches",
    retrieved.id,
    shipment.id as unknown as null | undefined,
  );
  TestValidator.equals(
    "order id matches",
    retrieved.order.id,
    order.id as unknown as null | undefined,
  );

  TestValidator.predicate(
    "shipment status present",
    retrieved.status.length > 0,
  );
  TestValidator.predicate(
    "shipment timestamps present",
    retrieved.createdAt.length > 0 && retrieved.updatedAt.length > 0,
  );
  TestValidator.notEquals(
    "tracking should not be null",
    retrieved.tracking,
    null,
  );

  const tracking = typia.assert(retrieved.tracking!);

  TestValidator.equals(
    "confirmation type matches",
    tracking.confirmationType,
    confirmation.confirmation_type as unknown as null | undefined,
  );
  TestValidator.equals(
    "confirmed at matches",
    tracking.confirmedAt,
    confirmation.confirmed_at as unknown as null | undefined,
  );
  TestValidator.equals(
    "carrier name matches",
    tracking.carrierName,
    confirmation.carrier_name as unknown as null | undefined,
  );
  TestValidator.equals(
    "tracking url matches",
    tracking.trackingUrl,
    confirmation.tracking_url as unknown as null | undefined,
  );
  TestValidator.equals(
    "tracking number matches",
    tracking.trackingNumber,
    confirmation.tracking_number as unknown as null | undefined,
  );

  TestValidator.predicate(
    "all order items are scoped to shipment",
    retrieved.orderItems.every(
      (item) => item.shopping_mall_shipment_id === shipment.id,
    ),
  );
}
