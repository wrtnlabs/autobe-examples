import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
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
import { generate_random_shopping_mall_member_shipments_confirmations_create } from "../../../generate/generate_random_shopping_mall_member_shipments_confirmations_create";
import { generate_random_shopping_mall_member_shipments_create } from "../../../generate/generate_random_shopping_mall_member_shipments_create";
import { prepare_random_shopping_mall_shipment } from "../../../prepare/prepare_random_shopping_mall_shipment";
import { prepare_random_shopping_mall_shipment_confirmation } from "../../../prepare/prepare_random_shopping_mall_shipment_confirmation";

export async function test_api_shipment_confirmation_update_conflicting_transition_prevented(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  const shipment = await generate_random_shopping_mall_member_shipments_create(
    memberConnection,
    {},
  );
  typia.assert(shipment);
  const initialConfirmedAt = new Date("2026-03-18T11:35:00.444Z").toISOString();
  const initialConfirmation =
    await generate_random_shopping_mall_member_shipments_confirmations_create(
      memberConnection,
      {
        params: { shipmentId: shipment.id },
        body: { confirmedAt: initialConfirmedAt },
      },
    );
  typia.assert(initialConfirmation);
  const beforeShipment = await api.functional.shoppingMall.member.shipments.at(
    memberConnection,
    { shipmentId: shipment.id },
  );
  typia.assert(beforeShipment);
  const beforeConfirmation =
    await api.functional.shoppingMall.member.shipment_confirmations.at(
      memberConnection,
      { shipmentConfirmationId: initialConfirmation.id },
    );
  typia.assert(beforeConfirmation);
  const conflictingConfirmationType = `${beforeConfirmation.confirmation_type}__conflict`;
  const updateAttempt = async () => {
    return await api.functional.shoppingMall.member.shipment_confirmations.update(
      memberConnection,
      {
        shipmentConfirmationId: initialConfirmation.id,
        body: {
          confirmation_type: conflictingConfirmationType,
          confirmed_at: new Date().toISOString(),
          tracking_url: beforeConfirmation.tracking_url,
          tracking_number: beforeConfirmation.tracking_number,
          carrier_name: beforeConfirmation.carrier_name,
          note: beforeConfirmation.note,
        } satisfies IShoppingMallShipmentConfirmation.IUpdate,
      },
    );
  };
  const updateResult = await (async () => {
    try {
      return { ok: true as const, data: await updateAttempt() };
    } catch (error) {
      return { ok: false as const, error };
    }
  })();
  // Whether rejected (throws) or treated as no-op (succeeds), the business state must not regress.
  const afterShipment = await api.functional.shoppingMall.member.shipments.at(
    memberConnection,
    { shipmentId: shipment.id },
  );
  typia.assert(afterShipment);
  const afterConfirmation =
    await api.functional.shoppingMall.member.shipment_confirmations.at(
      memberConnection,
      { shipmentConfirmationId: initialConfirmation.id },
    );
  typia.assert(afterConfirmation);
  // Shipment state must remain unchanged
  TestValidator.equals(
    "shipment status unchanged",
    afterShipment.status,
    beforeShipment.status,
  );
  // Shipment tracking derived from confirmation must remain unchanged
  TestValidator.equals(
    "shipment tracking unchanged",
    afterShipment.tracking,
    beforeShipment.tracking,
  );
  // Order item workflow status inside the shipment must not regress/change
  const beforeItemStatuses = beforeShipment.orderItems.map(
    (x) => x.line_item_status,
  );
  const afterItemStatuses = afterShipment.orderItems.map(
    (x) => x.line_item_status,
  );
  TestValidator.equals(
    "order item statuses unchanged",
    afterItemStatuses,
    beforeItemStatuses,
  );
  // Confirmation record should not reflect a conflicting transition
  TestValidator.equals(
    "confirmation_type unchanged",
    afterConfirmation.confirmation_type,
    beforeConfirmation.confirmation_type,
  );
  TestValidator.equals(
    "confirmation confirmed_at unchanged",
    afterConfirmation.confirmed_at,
    beforeConfirmation.confirmed_at,
  );
  TestValidator.equals(
    "confirmation tracking_url unchanged",
    afterConfirmation.tracking_url,
    beforeConfirmation.tracking_url,
  );
  TestValidator.equals(
    "confirmation tracking_number unchanged",
    afterConfirmation.tracking_number,
    beforeConfirmation.tracking_number,
  );
  TestValidator.equals(
    "confirmation carrier_name unchanged",
    afterConfirmation.carrier_name,
    beforeConfirmation.carrier_name,
  );
  TestValidator.equals(
    "confirmation note unchanged",
    afterConfirmation.note,
    beforeConfirmation.note,
  );
  // Extra guard: if the update call succeeded, the response must still match the unchanged confirmation.
  if (updateResult.ok) {
    TestValidator.equals(
      "update response confirmation_type unchanged",
      updateResult.data.confirmation_type,
      beforeConfirmation.confirmation_type,
    );
    TestValidator.equals(
      "update response confirmed_at unchanged",
      updateResult.data.confirmed_at,
      beforeConfirmation.confirmed_at,
    );
  }
}
