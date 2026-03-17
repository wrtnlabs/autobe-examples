import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAddress";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
import type { IEcommerceMallShipmentTrackingCode } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipmentTrackingCode";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_ecommerce_mall_seller_shipments_create } from "../../../generate/generate_random_ecommerce_mall_seller_shipments_create";
import { prepare_random_ecommerce_mall_shipment } from "../../../prepare/prepare_random_ecommerce_mall_shipment";

export async function test_api_seller_shipment_tracking_code_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller registration
  const sellerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallSeller.IJoin,
  });
  typia.assert(authorized);
  // 2. Create a shipment with tracking information
  const sellerAuthConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: authorized.token.access },
  };
  const shipment = await generate_random_ecommerce_mall_seller_shipments_create(
    sellerAuthConnection,
    {
      body: {
        order_item_ids: [typia.random<string & tags.Format<"uuid">>()],
        carrier_name: RandomGenerator.alphabets(6),
        carrier_phone: `+${RandomGenerator.alphaNumeric(10)}`,
      } satisfies IEcommerceMallShipment.ICreate,
    },
  );
  typia.assert(shipment);
  // 3. Retrieve shipment details to confirm tracking count exists
  const shipmentDetails =
    await api.functional.ecommerceMall.seller.shipments.at(
      sellerAuthConnection,
      {
        shipmentId: shipment.id,
      },
    );
  typia.assert(shipmentDetails);
  // 4. Generate a tracking code ID for testing
  // Note: Tracking codes are stored in a separate table, we generate a valid UUID
  // assuming tracking codes exist for this shipment
  const trackingCodeId = typia.random<string & tags.Format<"uuid">>();
  // 5. Retrieve the tracking code for the shipment
  const trackingCodeData =
    await api.functional.ecommerceMall.seller.shipments.tracking_codes.at(
      sellerAuthConnection,
      {
        shipmentId: shipment.id,
        trackingCodeId: trackingCodeId,
      },
    );
  typia.assert(trackingCodeData);
  // 6. Validate the response
  TestValidator.equals(
    "shipment ID matches",
    trackingCodeData.shipment.id,
    shipment.id,
  );
  TestValidator.equals(
    "carrier name matches",
    trackingCodeData.carrier_name,
    shipment.carrierName ?? undefined,
  );
  // Validate timestamps are valid date-time format
  TestValidator.predicate(
    "created_at is valid date-time",
    () => !isNaN(Date.parse(trackingCodeData.created_at)),
  );
  TestValidator.predicate(
    "updated_at is valid date-time",
    () => !isNaN(Date.parse(trackingCodeData.updated_at)),
  );
}
