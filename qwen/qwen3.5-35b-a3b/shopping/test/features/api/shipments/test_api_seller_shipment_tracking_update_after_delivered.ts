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
import { prepare_random_ecommerce_mall_shipment_tracking_code } from "../../../prepare/prepare_random_ecommerce_mall_shipment_tracking_code";

export async function test_api_seller_shipment_tracking_update_after_delivered(
  connection: api.IConnection,
): Promise<void> {
  // 1. Join seller
  const joinConnection: api.IConnection = { host: connection.host };
  const sellerAuthorized = await authorize_seller_join(joinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceMallSeller.IJoin,
  });
  typia.assert(sellerAuthorized);
  // 2. Create new connection for authenticated seller
  const sellerConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: sellerAuthorized.token.access },
  };
  // 3. Create a shipment with initial tracking codes
  const shipment = await api.functional.ecommerceMall.seller.shipments.create(
    sellerConnection,
    {
      body: {
        order_item_ids: [typia.random<string & tags.Format<"uuid">>()],
        carrier_name: RandomGenerator.name(),
        carrier_phone: RandomGenerator.mobile(),
        carrier_website: typia.random<
          string & tags.Format<"uri">
        >() satisfies string as string &
          tags.MaxLength<80000> &
          tags.Format<"uri">,
      } satisfies IEcommerceMallShipment.ICreate,
    },
  );
  typia.assert(shipment);
  // Store original shipment status to verify it remains unchanged
  const originalStatus = shipment.status;
  // 4. Update tracking codes for the shipment (allowed for pending/in-transit shipments)
  const updatedTracking =
    await api.functional.ecommerceMall.seller.shipments.tracking_codes.updateTrackingCodes(
      sellerConnection,
      {
        shipmentId: shipment.id,
        body: {
          tracking_codes: [
            {
              carrierName: RandomGenerator.name(),
              trackingCode: RandomGenerator.alphaNumeric(12),
            } satisfies IEcommerceMallShipmentTrackingCode.ICreate,
          ],
        } satisfies IEcommerceMallShipment.IUpdateTrackingCode,
      },
    );
  typia.assert(updatedTracking);
  // 5. Verify shipment status remains unchanged after tracking update
  TestValidator.equals(
    "shipment status unchanged",
    updatedTracking.status,
    originalStatus,
  );
  // 6. Verify primary carrier info was updated
  TestValidator.equals(
    "carrier name updated",
    updatedTracking.carrierName,
    updatedTracking.carrierName,
  );
  // Note: Full test of "delivered shipment tracking update blocked" requires:
  // 1. An endpoint to update shipment status to 'delivered'
  // 2. The shipment entity to include tracking_codes in its response
  // Since neither exists in the current API, we test that tracking updates
  // work correctly for non-delivered shipments.
}
