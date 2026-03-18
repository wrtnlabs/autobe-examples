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

export async function test_api_shipment_confirmations_create_with_tracking(
  connection: api.IConnection,
): Promise<void> {
  // 1) Authenticated member (seller actor)
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(sellerConnection, {});

  // 2) Create a shipment that already has initial confirmation/tracking context
  const initialConfirmedAt = new Date("2026-03-18T11:36:23.482Z").toISOString();
  const initialConfirmationType = `init_${typia.random<string>()}`;
  const initialTrackingUrl = `https://tracking.initial/${typia.random<string>()}`;
  const initialTrackingNumber = `INIT-${typia.random<string>()}`;
  const initialCarrierName = `InitCarrier-${typia.random<string>()}`;
  const initialNote = `InitNote-${typia.random<string>()}`;

  const shipmentSeed =
    await generate_random_shopping_mall_member_shipments_create(
      sellerConnection,
      {
        body: {
          shipment_confirmation: {
            shoppingMallShipmentId:
              "00000000-0000-0000-0000-000000000000" as string &
                tags.Format<"uuid">,
            confirmationType: initialConfirmationType,
            confirmedAt: initialConfirmedAt satisfies string &
              tags.Format<"date-time">,
            trackingUrl: initialTrackingUrl satisfies string &
              tags.Format<"url">,
            trackingNumber: initialTrackingNumber,
            carrierName: initialCarrierName,
            note: initialNote,
          },
        },
      },
    );

  typia.assert(shipmentSeed);

  // 3) Submit shipment confirmation with full tracking metadata
  const confirmedAt = new Date("2026-03-18T11:36:23.482Z").toISOString();
  const confirmationType = `confirm_${typia.random<string>()}`;
  const trackingUrl = `https://tracking.example/${typia.random<string>()}`;
  const trackingNumber = `TN-${typia.random<string>()}`;
  const carrierName = `Carrier-${typia.random<string>()}`;
  const note = `Note-${typia.random<string>()}`;

  const confirmation =
    await api.functional.shoppingMall.member.shipments.confirmations.create(
      sellerConnection,
      {
        shipmentId: shipmentSeed.id,
        body: {
          shoppingMallShipmentId: shipmentSeed.id,
          confirmationType,
          confirmedAt: confirmedAt satisfies string &
            tags.Format<"date-time">,
          trackingUrl: trackingUrl satisfies string & tags.Format<"url">,
          trackingNumber,
          carrierName,
          note,
        } satisfies IShoppingMallShipmentConfirmation.ICreate,
      },
    );

  typia.assert(confirmation);

  // 4) Validate persisted fields in the confirmation response
  TestValidator.equals(
    "shipment id matches",
    confirmation.shopping_mall_shipment_id,
    shipmentSeed.id,
  );
  TestValidator.equals(
    "confirmation type matches",
    confirmation.confirmation_type,
    confirmationType,
  );
  TestValidator.equals(
    "confirmed at matches",
    confirmation.confirmed_at,
    confirmedAt,
  );
  TestValidator.equals(
    "tracking url matches",
    confirmation.tracking_url,
    trackingUrl,
  );
  TestValidator.equals(
    "tracking number matches",
    confirmation.tracking_number,
    trackingNumber,
  );
  TestValidator.equals(
    "carrier name matches",
    confirmation.carrier_name,
    carrierName,
  );
  TestValidator.equals("note matches", confirmation.note, note);

  // 5) Shipment tracking invariant: based on shipment_seed.tracking derived from initial confirmation.
  // (We cannot re-read shipment after confirmation without an explicit GET endpoint.)
  if (shipmentSeed.tracking !== null) {
    // Ensure tracking shape aligns with the initial confirmation context
    TestValidator.equals(
      "initial shipment tracking confirmationType",
      shipmentSeed.tracking.confirmationType,
      null as null,
    );
  }
}
