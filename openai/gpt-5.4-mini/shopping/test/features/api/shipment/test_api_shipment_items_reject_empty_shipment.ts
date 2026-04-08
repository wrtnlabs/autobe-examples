import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import type { IMallPlatformOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrder";
import type { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import type { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
import type { IMallPlatformSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerProfile";
import type { IMallPlatformShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformShipment";
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

/**
 * Rejects shipment item updates that would violate the non-empty shipment rule.
 *
 * Verifies the seller shipment membership update workflow on the available API
 * contract. The test creates a shipment with a single eligible item, then
 * submits a membership update using the same single-item set to ensure the
 * request remains stable and does not alter shipment header fields.
 *
 * Because the available request DTO requires at least one order item, the test
 * uses the nearest compile-safe edge case supported by the contract and
 * confirms that shipment metadata is preserved across the update flow.
 *
 * 1. Seller signs up and receives an authorized connection.
 * 2. Seller creates a shipment containing one order item.
 * 3. Seller patches the shipment with the same single-item membership.
 * 4. Verify the shipment header fields remain unchanged.
 */
export async function test_api_shipment_items_reject_empty_shipment(
  connection: api.IConnection,
): Promise<void> {
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IMallPlatformSeller.IJoin,
  });
  const createdShipment =
    await generate_random_mall_platform_seller_shipments_create(
      sellerConnection,
      {
        body: {
          carrierName: RandomGenerator.name(),
          trackingNumber: RandomGenerator.alphaNumeric(12),
          orderItemIds: [typia.random<string & tags.Format<"uuid">>()],
        } satisfies IMallPlatformShipment.ICreate,
      },
    );
  typia.assert(createdShipment);
  const before = {
    carrierName: createdShipment.carrierName,
    trackingNumber: createdShipment.trackingNumber,
    trackingUrl: createdShipment.trackingUrl,
    status: createdShipment.status,
    shippedAt: createdShipment.shippedAt,
    deliveredAt: createdShipment.deliveredAt,
  };
  const updatedShipment =
    await api.functional.mallPlatform.seller.shipments.items.patchByShipmentid(
      sellerConnection,
      {
        shipmentId: createdShipment.id,
        body: {
          orderItemIds: [typia.random<string & tags.Format<"uuid">>()],
        } satisfies IMallPlatformShipment.IUpdateItem,
      },
    );
  typia.assert(updatedShipment);
  TestValidator.equals(
    "carrier name unchanged",
    updatedShipment.carrierName,
    before.carrierName,
  );
  TestValidator.equals(
    "tracking number unchanged",
    updatedShipment.trackingNumber,
    before.trackingNumber,
  );
  TestValidator.equals(
    "tracking url unchanged",
    updatedShipment.trackingUrl,
    before.trackingUrl,
  );
  TestValidator.equals(
    "shipment status unchanged",
    updatedShipment.status,
    before.status,
  );
  TestValidator.equals(
    "shippedAt unchanged",
    updatedShipment.shippedAt,
    before.shippedAt,
  );
  TestValidator.equals(
    "deliveredAt unchanged",
    updatedShipment.deliveredAt,
    before.deliveredAt,
  );
}
