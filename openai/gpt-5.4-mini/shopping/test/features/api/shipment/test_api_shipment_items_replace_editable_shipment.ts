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

export async function test_api_shipment_items_replace_editable_shipment(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test seller shipment item replacement on an editable shipment.
   *
   * Verifies that a seller can replace the full composition of an editable shipment using only eligible order items that belong to the same seller. The test ensures the updated shipment-item page reflects the persisted replacement, removed items no longer appear, newly included items appear exactly once, and the shipment ownership remains unchanged.
   *
   * 1. Authenticate a seller with a fresh actor-specific connection.
   * 2. Query eligible order items for the seller and require at least one item.
   * 3. Create a seller-owned shipment with a valid initial item set.
   * 4. Replace the shipment item composition with a final eligible item list.
   * 5. Validate persistence, membership changes, and ownership consistency.
   */
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
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
  const eligibleItems = eligiblePage.data;
  TestValidator.predicate(
    "seller should have at least one eligible order item",
    eligibleItems.length > 0,
  );
  const initialOrderItemId = eligibleItems[0]!.id;
  const initialShipment =
    await api.functional.mallPlatform.seller.shipments.create(
      sellerConnection,
      {
        body: {
          shipmentItems: [
            {
              orderItemIds: [initialOrderItemId],
            } satisfies IMallPlatformShipmentItem.ICreate,
          ],
          carrierName: RandomGenerator.name(),
          trackingNumber: RandomGenerator.alphaNumeric(12),
        } satisfies IMallPlatformShipment.ICreate,
      },
    );
  typia.assert(initialShipment);
  const originalOrderItemIds = initialShipment.shipmentItems.map(
    (item) => item.orderItem.id,
  );
  TestValidator.predicate(
    "editable shipment should start with at least one item",
    originalOrderItemIds.length > 0,
  );
  const replacementOrderItemIds = Array.from(
    new Set([
      ...(eligibleItems.length > 1 ? [eligibleItems[1]!.id] : []),
      ...originalOrderItemIds.slice(0, 1),
    ]),
  );
  TestValidator.predicate(
    "replacement list must not be empty",
    replacementOrderItemIds.length > 0,
  );
  const updatedPage =
    await api.functional.mallPlatform.seller.shipments.shipmentItems.index(
      sellerConnection,
      {
        shipmentId: initialShipment.id,
        body: {
          orderItemIds: replacementOrderItemIds,
        } satisfies IMallPlatformShipmentItem.IUpdate,
      },
    );
  typia.assert(updatedPage);
  TestValidator.equals(
    "updated shipment item count should match replacement list",
    updatedPage.data.length,
    replacementOrderItemIds.length,
  );
  TestValidator.equals(
    "updated shipment should remain owned by the same seller",
    updatedPage.data[0]?.shipment.seller.id,
    initialShipment.seller.id,
  );
  TestValidator.equals(
    "shipment id should remain unchanged",
    updatedPage.data[0]?.shipment.id,
    initialShipment.id,
  );
  const updatedOrderItemIds = updatedPage.data.map((item) => item.orderItem.id);
  for (const orderItemId of replacementOrderItemIds) {
    TestValidator.predicate(
      `replacement order item ${orderItemId} should exist exactly once`,
      updatedOrderItemIds.filter((value) => value === orderItemId).length === 1,
    );
  }
  for (const orderItemId of originalOrderItemIds) {
    if (!replacementOrderItemIds.includes(orderItemId)) {
      TestValidator.predicate(
        `removed order item ${orderItemId} should not remain in shipment`,
        !updatedOrderItemIds.includes(orderItemId),
      );
    }
  }
}
