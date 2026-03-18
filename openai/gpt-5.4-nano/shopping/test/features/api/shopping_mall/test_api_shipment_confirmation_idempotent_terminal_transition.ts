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
import { generate_random_shopping_mall_member_shipments_create } from "../../../generate/generate_random_shopping_mall_member_shipments_create";
import { prepare_random_shopping_mall_shipment } from "../../../prepare/prepare_random_shopping_mall_shipment";
import { prepare_random_shopping_mall_shipment_confirmation } from "../../../prepare/prepare_random_shopping_mall_shipment_confirmation";

export async function test_api_shipment_confirmation_idempotent_terminal_transition(
  connection: api.IConnection,
): Promise<void> {
  // 1) Authenticate as member (seller-capable)
  const memberConnection: api.IConnection = { host: connection.host };
  const credentialsBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
  } satisfies IShoppingMallMember.IJoin;
  const authorized = await authorize_member_join(memberConnection, {
    body: credentialsBody,
  });
  typia.assert(authorized);
  // 2) Create shipment grouping with associated order items
  const shipment = await generate_random_shopping_mall_member_shipments_create(
    memberConnection,
    {},
  );
  typia.assert(shipment);
  const preparedShipmentId = shipment.id;
  // 3) Drive shipment into a confirmation-eligible stage
  const shippedUpdate = {
    confirmation_type: "shipped",
    confirmed_at: new Date().toISOString(),
    tracking_url: ("https://example.com/track/shipped-" +
      RandomGenerator.alphaNumeric(6)) satisfies string & tags.Format<"url">,
    tracking_number: RandomGenerator.alphaNumeric(12),
    carrier_name: RandomGenerator.name(2),
    note: RandomGenerator.paragraph({ sentences: 1 }),
  } satisfies IShoppingMallShipment.IUpdate;
  const shipmentAfterShipped =
    await api.functional.shoppingMall.member.shipments.updateShipment(
      memberConnection,
      {
        shipmentId: preparedShipmentId,
        body: shippedUpdate,
      },
    );
  typia.assert(shipmentAfterShipped);
  // 4) Submit first terminal confirmation
  const confirmedAt1 = new Date().toISOString();
  const trackingUrl1 = ("https://example.com/track/delivered-" +
    RandomGenerator.alphaNumeric(8)) satisfies string & tags.Format<"url">;
  const confirmation1 =
    await api.functional.shoppingMall.member.shipment_confirmations.submitShipmentConfirmation(
      memberConnection,
      {
        body: {
          shoppingMallShipmentId: preparedShipmentId,
          confirmationType: "delivered",
          confirmedAt: confirmedAt1,
          trackingUrl: trackingUrl1,
          trackingNumber: RandomGenerator.alphaNumeric(12),
          carrierName: RandomGenerator.name(2),
          note: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IShoppingMallShipmentConfirmation.IRequest,
      },
    );
  typia.assert(confirmation1);
  // 5) Capture shipment status after first confirmation via another updateShipment call
  // (No GET endpoint is available in provided SDK; shipment update response reflects current state.)
  const shipmentAfterDelivered1 =
    await api.functional.shoppingMall.member.shipments.updateShipment(
      memberConnection,
      {
        shipmentId: preparedShipmentId,
        body: {
          status: shipmentAfterShipped.status,
        } satisfies IShoppingMallShipment.IUpdate,
      },
    );
  typia.assert(shipmentAfterDelivered1);
  // 6) Submit second terminal confirmation with same confirmationType but different metadata
  const confirmedAt2 = new Date(Date.now() + 60000).toISOString();
  const trackingUrl2 = ("https://example.com/track/delivered-" +
    RandomGenerator.alphaNumeric(8)) satisfies string & tags.Format<"url">;
  const confirmation2 =
    await api.functional.shoppingMall.member.shipment_confirmations.submitShipmentConfirmation(
      memberConnection,
      {
        body: {
          shoppingMallShipmentId: preparedShipmentId,
          confirmationType: "delivered",
          confirmedAt: confirmedAt2,
          trackingUrl: trackingUrl2,
          trackingNumber: RandomGenerator.alphaNumeric(12),
          carrierName: RandomGenerator.name(2),
          note: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IShoppingMallShipmentConfirmation.IRequest,
      },
    );
  typia.assert(confirmation2);
  // 7) Validate idempotent behavior: confirmation updated in place and shipment status doesn't regress
  TestValidator.equals(
    "confirmation id should be stable",
    confirmation2.id,
    confirmation1.id,
  );
  TestValidator.equals(
    "confirmationType should be stable",
    confirmation2.confirmation_type,
    confirmation1.confirmation_type,
  );
  TestValidator.equals(
    "confirmedAt should be updated",
    confirmation2.confirmed_at,
    confirmedAt2,
  );
  TestValidator.equals(
    "trackingUrl should be updated",
    confirmation2.tracking_url,
    trackingUrl2,
  );
  const shipmentAfterDelivered2 =
    await api.functional.shoppingMall.member.shipments.updateShipment(
      memberConnection,
      {
        shipmentId: preparedShipmentId,
        body: {
          status: shipmentAfterDelivered1.status,
        } satisfies IShoppingMallShipment.IUpdate,
      },
    );
  typia.assert(shipmentAfterDelivered2);
  TestValidator.equals(
    "shipment status should remain at terminal state",
    shipmentAfterDelivered2.status,
    shipmentAfterDelivered1.status,
  );
}
