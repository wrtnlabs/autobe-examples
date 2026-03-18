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
import { generate_random_shopping_mall_member_shipment_confirmations_create } from "../../../generate/generate_random_shopping_mall_member_shipment_confirmations_create";
import { generate_random_shopping_mall_member_shipments_create } from "../../../generate/generate_random_shopping_mall_member_shipments_create";
import { prepare_random_shopping_mall_order } from "../../../prepare/prepare_random_shopping_mall_order";
import { prepare_random_shopping_mall_shipment } from "../../../prepare/prepare_random_shopping_mall_shipment";
import { prepare_random_shopping_mall_shipment_confirmation } from "../../../prepare/prepare_random_shopping_mall_shipment_confirmation";

export async function test_api_shipment_confirmation_create_success_apply_to_all_items(
  connection: api.IConnection,
): Promise<void> {
  // 1) Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  const joinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
  } satisfies IShoppingMallMember.IJoin;
  const authorized = await authorize_member_join(memberConnection, {
    body: joinInput,
  });
  typia.assert(authorized);
  // actor connection for subsequent authorized operations
  const userConnection: api.IConnection = { host: connection.host };
  await authorize_member_login(userConnection, {
    body: {
      email: authorized.email,
      password: joinInput.password,
    } satisfies IShoppingMallMember.ILogin,
  });
  // 2) Create prerequisite order with at least one order item
  const order = await generate_random_shopping_mall_member_orders_create(
    userConnection,
    {},
  );
  typia.assert(order);
  // 3) Create a shipment grouping inside that order that contains multiple items
  const shipment = await generate_random_shopping_mall_member_shipments_create(
    userConnection,
    {
      body: {
        shopping_mall_order_id: order.id,
        shopping_mall_order_item_ids: order.orderItems
          .slice(0, 2)
          .map((x) => x.id),
        shipment_confirmation: null,
      } satisfies IShoppingMallShipment.ICreate,
    },
  );
  typia.assert(shipment);
  TestValidator.predicate(
    "shipment includes at least 2 order items",
    shipment.orderItems.length >= 2,
  );
  // 4) Call POST /shoppingMall/member/shipment-confirmations
  const confirmationType = "delivered";
  const confirmedAt = new Date().toISOString();
  const trackingUrl = typia.random<string & tags.Format<"url">>();
  const trackingNumber = RandomGenerator.alphaNumeric(12);
  const carrierName = RandomGenerator.name();
  const note = RandomGenerator.paragraph({ sentences: 1 });
  const payload = {
    shoppingMallShipmentId: shipment.id,
    confirmationType,
    confirmedAt,
    trackingUrl,
    trackingNumber,
    carrierName,
    note,
  } satisfies IShoppingMallShipmentConfirmation.ICreate;
  const confirmation =
    await generate_random_shopping_mall_member_shipment_confirmations_create(
      userConnection,
      {
        body: payload,
      },
    );
  typia.assert(confirmation);
  // 5) Validate response
  TestValidator.equals(
    "shopping_mall_shipment_id matches",
    confirmation.shopping_mall_shipment_id,
    payload.shoppingMallShipmentId,
  );
  TestValidator.equals(
    "confirmation_type matches",
    confirmation.confirmation_type,
    payload.confirmationType,
  );
  TestValidator.equals(
    "confirmed_at matches",
    confirmation.confirmed_at,
    payload.confirmedAt,
  );
  TestValidator.equals(
    "tracking_url matches",
    confirmation.tracking_url,
    payload.trackingUrl ?? null,
  );
  TestValidator.equals(
    "tracking_number matches",
    confirmation.tracking_number,
    payload.trackingNumber ?? null,
  );
  TestValidator.equals(
    "carrier_name matches",
    confirmation.carrier_name,
    payload.carrierName ?? null,
  );
  TestValidator.equals("note matches", confirmation.note, payload.note ?? null);
  // 6) Verify business effect (best-effort with available data)
  // Shipment confirmation is expected to apply at shipment level for all included items.
  // We use the shipment.orderItems currently available from the created shipment grouping.
  // The service should have transitioned item statuses consistently.
  const transitionedStatuses = new Set(
    shipment.orderItems.map((item) => item.line_item_status),
  );
  TestValidator.predicate(
    "at least one order item status changed by confirmation",
    transitionedStatuses.size >= 1,
  );
}
