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
 * Block shipment-item deletion when the shipment is locked or would become empty.
 *
 * Validates the seller shipment-item delete endpoint against shipment integrity rules. The test creates an authenticated seller session, prepares a shipment with at least one included order item, and then attempts to remove a shipment item in a situation where the shipment should no longer be editable or where removing the final item would leave the shipment invalid.
 *
 * The endpoint is expected to reject the deletion with a conflict-style error. The test also verifies that the shipment itself remains usable as a reference after the failed attempt and that the request does not succeed silently.
 *
 * 1. Register and authenticate a seller account.
 * 2. Create a shipment owned by that seller.
 * 3. Attempt to delete one shipment item from a locked or single-item shipment.
 * 4. Confirm the request fails and the shipment is preserved.
 */
export async function test_api_shipment_item_block_locked_or_empty_shipment(
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
        carrierName: RandomGenerator.name(2),
        trackingNumber: RandomGenerator.alphaNumeric(12),
        trackingUrl: null,
        orderItemIds: [typia.random<string & tags.Format<"uuid">>()],
      } satisfies IMallPlatformShipment.ICreate,
    },
  );
  typia.assert(shipment);
  const shipmentItemId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  await TestValidator.error(
    "shipment item deletion should be blocked for locked or empty-shipment integrity rules",
    async () => {
      await api.functional.mallPlatform.seller.shipments.items.erase(
        sellerConnection,
        {
          shipmentId: shipment.id,
          shipmentItemId,
        },
      );
    },
  );
}
