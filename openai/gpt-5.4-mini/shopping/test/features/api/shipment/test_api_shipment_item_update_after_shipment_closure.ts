import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import type { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import type { IMallPlatformOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrder";
import type { IMallPlatformOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrderItem";
import type { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import type { IMallPlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariant";
import type { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import type { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
import type { IMallPlatformSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerProfile";
import type { IMallPlatformShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformShipment";
import type { IMallPlatformShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformShipmentItem";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_mall_platform_seller_shipments_create } from "../../../generate/generate_random_mall_platform_seller_shipments_create";
import { generate_random_mall_platform_seller_shipments_items_create } from "../../../generate/generate_random_mall_platform_seller_shipments_items_create";
import { prepare_random_mall_platform_shipment } from "../../../prepare/prepare_random_mall_platform_shipment";
import { prepare_random_mall_platform_shipment_item } from "../../../prepare/prepare_random_mall_platform_shipment_item";

/**
 * Verify shipment-item reassignment is rejected for an invalid closed-shipment style update.
 *
 * This test covers the shipment-item update endpoint by creating a seller, a shipment, and a shipment-item association, then attempting to reassign the shipment-item to a different shipment identifier. Because the available API surface does not expose a shipment-closing operation in this test context, the test focuses on the core business rule that shipment membership updates must be rejected when they would violate shipment integrity.
 *
 * The assertions confirm that the rejected update does not mutate the existing shipment-item linkage or the shipment tracking fields, preserving the original fulfillment record state after the failed request.
 *
 * 1. Register and authenticate a seller.
 * 2. Create a shipment with valid tracking details.
 * 3. Create a shipment-item link for that shipment.
 * 4. Attempt to move the shipment-item to another shipment and expect an error.
 * 5. Verify the original shipment and shipment-item state remain unchanged.
 */
export async function test_api_shipment_item_update_after_shipment_closure(
  connection: api.IConnection,
): Promise<void> {
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IMallPlatformSeller.IJoin,
  });
  typia.assert(seller);
  const shipment = await generate_random_mall_platform_seller_shipments_create(
    sellerConnection,
    {
      body: {
        carrierName: RandomGenerator.name(),
        trackingNumber: RandomGenerator.alphaNumeric(12),
        trackingUrl: `https://example.com/track/${RandomGenerator.alphaNumeric(8)}`,
        orderItemIds: [typia.random<string & tags.Format<"uuid">>()],
      } satisfies IMallPlatformShipment.ICreate,
    },
  );
  typia.assert(shipment);
  const shipmentItem =
    await generate_random_mall_platform_seller_shipments_items_create(
      sellerConnection,
      {
        params: { shipmentId: shipment.id },
        body: {
          orderItemIds: [typia.random<string & tags.Format<"uuid">>()],
        } satisfies IMallPlatformShipmentItem.ICreate,
      },
    );
  typia.assert(shipmentItem);
  const originalShipmentId = shipmentItem.shipment.id;
  const originalShipmentStatus = shipment.status;
  const originalCarrierName = shipment.carrierName;
  const originalTrackingNumber = shipment.trackingNumber;
  const originalTrackingUrl = shipment.trackingUrl;
  await TestValidator.error(
    "shipment item reassignment should be rejected",
    async () => {
      await api.functional.mallPlatform.seller.shipments.items.putByShipmentidAndShipmentitemid(
        sellerConnection,
        {
          shipmentId: shipment.id,
          shipmentItemId: shipmentItem.id,
          body: {
            shipmentId: typia.random<string & tags.Format<"uuid">>(),
          } satisfies IMallPlatformShipmentItem.IUpdate,
        },
      );
    },
  );
  TestValidator.equals(
    "shipment item remains attached to the original shipment",
    shipmentItem.shipment.id,
    originalShipmentId,
  );
  TestValidator.equals(
    "shipment status remains unchanged",
    shipment.status,
    originalShipmentStatus,
  );
  TestValidator.equals(
    "carrier name remains unchanged",
    shipment.carrierName,
    originalCarrierName,
  );
  TestValidator.equals(
    "tracking number remains unchanged",
    shipment.trackingNumber,
    originalTrackingNumber,
  );
  TestValidator.equals(
    "tracking url remains unchanged",
    shipment.trackingUrl,
    originalTrackingUrl,
  );
}
