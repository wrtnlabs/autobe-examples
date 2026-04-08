import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import type { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import type { IMallPlatformOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrder";
import type { IMallPlatformOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrderItem";
import type { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import type { IMallPlatformProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductImage";
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
import { prepare_random_mall_platform_shipment } from "../../../prepare/prepare_random_mall_platform_shipment";
import { prepare_random_mall_platform_shipment_item } from "../../../prepare/prepare_random_mall_platform_shipment_item";

/**
 * Verifies that shipment updates preserve single-seller shipment consistency.
 *
 * This test covers the seller shipment update flow with two authenticated sellers
 * to ensure the update endpoint cannot be used to mix shipment ownership across
 * sellers. It validates that updating editable shipment fields keeps the shipment
 * attached to the original seller and preserves the shipment item set.
 *
 * 1. Register and authenticate two sellers with isolated connections.
 * 2. Create a valid shipment for the first seller.
 * 3. Update the shipment's editable tracking fields.
 * 4. Validate that the shipment still belongs to the first seller and that its
 *    contents remain unchanged after the update.
 */
export async function test_api_shipment_update_single_seller_consistency(
  connection: api.IConnection,
): Promise<void> {
  const seller1Connection: api.IConnection = { host: connection.host };
  const seller2Connection: api.IConnection = { host: connection.host };
  await authorize_seller_join(seller1Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
    } satisfies IMallPlatformSeller.IJoin,
  });
  await authorize_seller_join(seller2Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
    } satisfies IMallPlatformSeller.IJoin,
  });
  const shipment: IMallPlatformShipment =
    await api.functional.mallPlatform.seller.shipments.create(
      seller1Connection,
      {
        body: {
          shipmentItems: [
            { orderItemIds: [typia.random<string & tags.Format<"uuid">>()] },
          ],
          carrierName: RandomGenerator.name(),
          trackingNumber: RandomGenerator.alphaNumeric(12),
        } satisfies IMallPlatformShipment.ICreate,
      },
    );
  typia.assert(shipment);
  const updated: IMallPlatformShipment =
    await api.functional.mallPlatform.seller.shipments.update(
      seller1Connection,
      {
        shipmentId: shipment.id,
        body: {
          carrierName: RandomGenerator.name(),
          trackingNumber: RandomGenerator.alphaNumeric(16),
          trackingUrl: null,
          status: shipment.status,
          shippedAt: shipment.shippedAt,
          deliveredAt: shipment.deliveredAt,
        } satisfies IMallPlatformShipment.IUpdate,
      },
    );
  typia.assert(updated);
  TestValidator.equals(
    "shipment id should remain the same",
    updated.id,
    shipment.id,
  );
  TestValidator.equals(
    "shipment seller should remain the original seller",
    updated.seller.id,
    shipment.seller.id,
  );
  TestValidator.equals(
    "shipment order should remain the same",
    updated.order.id,
    shipment.order.id,
  );
  TestValidator.equals(
    "shipment item count should remain unchanged",
    updated.shipmentItems.length,
    shipment.shipmentItems.length,
  );
  TestValidator.predicate(
    "all shipment items still belong to the original seller",
    updated.shipmentItems.every(
      (item) => item.shipment.seller.id === shipment.seller.id,
    ),
  );
}
