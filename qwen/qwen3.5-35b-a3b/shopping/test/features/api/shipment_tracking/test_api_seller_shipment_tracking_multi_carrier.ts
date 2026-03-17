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

export async function test_api_seller_shipment_tracking_multi_carrier(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller joins and gets approved
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPass123!",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(seller);
  // 2. Create initial shipment with one tracking code
  const orderItemIds = ArrayUtil.repeat(2, () =>
    typia.random<string & tags.Format<"uuid">>(),
  );
  const initialShipment =
    await api.functional.ecommerceMall.seller.shipments.create(
      sellerConnection,
      {
        body: {
          order_item_ids: orderItemIds,
          carrier_name: RandomGenerator.name(2),
          carrier_phone: RandomGenerator.mobile(),
        } satisfies IEcommerceMallShipment.ICreate,
      },
    );
  typia.assert(initialShipment);
  // 3. Update tracking codes with multiple entries (multi-carrier scenario)
  const trackingCodes = ArrayUtil.repeat(
    3,
    (index) =>
      ({
        carrierName: RandomGenerator.name(2),
        trackingCode: RandomGenerator.alphaNumeric(10) + index,
      }) satisfies IEcommerceMallShipmentTrackingCode.ICreate,
  );
  const updatedShipment =
    await api.functional.ecommerceMall.seller.shipments.tracking_codes.updateTrackingCodes(
      sellerConnection,
      {
        shipmentId: initialShipment.id,
        body: {
          tracking_codes: trackingCodes,
        } satisfies IEcommerceMallShipment.IUpdateTrackingCode,
      },
    );
  typia.assert(updatedShipment);
  // 4. Validate shipment was updated successfully
  TestValidator.equals(
    "shipment still exists",
    updatedShipment.id,
    initialShipment.id,
  );
  // 5. Verify carrier info was updated
  TestValidator.equals(
    "shipment carrier name updated",
    updatedShipment.carrierName !== null,
    true,
  );
  // 6. Verify shipment was actually updated (updated_at should change)
  TestValidator.notEquals(
    "shipment updated at changed",
    initialShipment.updatedAt,
    updatedShipment.updatedAt,
  );
  // 7. Test unique constraint - try to add duplicate tracking code
  const duplicateTrackingCode = trackingCodes[0];
  await TestValidator.error("duplicate tracking code rejected", async () => {
    // This should fail due to unique constraint on tracking_code within shipment
    await api.functional.ecommerceMall.seller.shipments.tracking_codes.updateTrackingCodes(
      sellerConnection,
      {
        shipmentId: initialShipment.id,
        body: {
          tracking_codes: [duplicateTrackingCode, duplicateTrackingCode],
        } satisfies IEcommerceMallShipment.IUpdateTrackingCode,
      },
    );
  });
  // 8. Verify minimal tracking code validation - at least 1 required
  await TestValidator.error("empty tracking codes rejected", async () => {
    await api.functional.ecommerceMall.seller.shipments.tracking_codes.updateTrackingCodes(
      sellerConnection,
      {
        shipmentId: initialShipment.id,
        body: {
          tracking_codes: [],
        } satisfies IEcommerceMallShipment.IUpdateTrackingCode,
      },
    );
  });
}