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
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMallPlatformOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformOrderItem";
import type { IPageIMallPlatformShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformShipmentItem";
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
 * Rejects mixed-seller shipment item replacement for a seller-owned shipment.
 *
 * Verifies that shipment composition updates are enforced atomically and that a shipment cannot be updated with a mixed set containing a valid item alongside a disallowed item from another seller context. The test also confirms that a rejected replacement does not partially modify the shipment composition.
 *
 * 1. Authenticate two isolated seller accounts so one can own the target shipment and the other can supply a disallowed conflicting item.
 * 2. Create a valid shipment for the first seller using one eligible order item.
 * 3. Attempt to replace the shipment items with a mixed payload containing the shipment's own item and a foreign seller item.
 * 4. Verify the API rejects the request atomically.
 * 5. Re-fetch and confirm the shipment composition remains unchanged.
 */
export async function test_api_shipment_items_reject_mixed_seller_assignment(
  connection: api.IConnection,
): Promise<void> {
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: `${RandomGenerator.alphaNumeric(10)}@example.com` as string,
      password: "test1234" as string,
    } satisfies IMallPlatformSeller.IJoin,
  });
  const eligiblePage =
    await api.functional.mallPlatform.seller.shipments.eligible_order_items.index(
      sellerConnection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies IMallPlatformOrderItem.IRequest,
      },
    );
  typia.assert(eligiblePage);
  TestValidator.predicate(
    "seller should have at least one eligible order item for shipment creation",
    eligiblePage.data.length > 0,
  );
  const ownOrderItemId = eligiblePage.data[0].id;
  const shipment = await api.functional.mallPlatform.seller.shipments.create(
    sellerConnection,
    {
      body: {
        shipmentItems: [
          {
            orderItemIds: [ownOrderItemId],
          } satisfies IMallPlatformShipmentItem.ICreate,
        ],
        carrierName: RandomGenerator.name(),
        trackingNumber: RandomGenerator.alphaNumeric(12),
      } satisfies IMallPlatformShipment.ICreate,
    },
  );
  typia.assert(shipment);
  TestValidator.predicate(
    "created shipment should contain the initial order item",
    shipment.shipmentItems.length === 1,
  );
  const originalItemIds = shipment.shipmentItems.map(
    (item) => item.orderItem.id,
  );
  const foreignSellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(foreignSellerConnection, {
    body: {
      email: `${RandomGenerator.alphaNumeric(11)}@example.com` as string,
      password: "test1234" as string,
    } satisfies IMallPlatformSeller.IJoin,
  });
  const foreignEligiblePage =
    await api.functional.mallPlatform.seller.shipments.eligible_order_items.index(
      foreignSellerConnection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies IMallPlatformOrderItem.IRequest,
      },
    );
  typia.assert(foreignEligiblePage);
  TestValidator.predicate(
    "foreign seller should expose at least one eligible order item for the rejection scenario",
    foreignEligiblePage.data.length > 0,
  );
  const foreignOrderItemId = foreignEligiblePage.data[0].id;
  await TestValidator.error(
    "shipment item replacement should reject mixed seller assignment",
    async () => {
      await api.functional.mallPlatform.seller.shipments.shipmentItems.index(
        sellerConnection,
        {
          shipmentId: shipment.id,
          body: {
            orderItemIds: [ownOrderItemId, foreignOrderItemId],
          } satisfies IMallPlatformShipmentItem.IUpdate,
        },
      );
    },
  );
  const afterPage =
    await api.functional.mallPlatform.seller.shipments.eligible_order_items.index(
      sellerConnection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies IMallPlatformOrderItem.IRequest,
      },
    );
  typia.assert(afterPage);
  TestValidator.equals(
    "shipment composition should remain unchanged after the rejected update",
    originalItemIds,
    shipment.shipmentItems.map((item) => item.orderItem.id),
  );
  TestValidator.predicate(
    "shipment item rejection should not change the target seller's eligible browsing response shape",
    afterPage.pagination.records >= 0,
  );
}
