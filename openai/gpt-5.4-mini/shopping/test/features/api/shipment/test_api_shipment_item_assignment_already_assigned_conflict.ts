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
import { generate_random_mall_platform_seller_shipments_shipment_items_create } from "../../../generate/generate_random_mall_platform_seller_shipments_shipment_items_create";
import { prepare_random_mall_platform_shipment } from "../../../prepare/prepare_random_mall_platform_shipment";
import { prepare_random_mall_platform_shipment_item } from "../../../prepare/prepare_random_mall_platform_shipment_item";

export async function test_api_shipment_item_assignment_already_assigned_conflict(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test shipment item assignment conflict when an order item is already attached.
   *
   * This test validates that a seller cannot attach the same order item to more
   * than one active shipment. It creates two shipments under the same seller,
   * assigns one order item to the first shipment, and then verifies that a
   * second assignment attempt to another shipment is rejected.
   *
   * 1. Register a seller and create two shipments.
   * 2. Acquire a shipment item from the first shipment and reuse its order item id.
   * 3. Attach the order item to the first shipment.
   * 4. Attempt to attach the same order item to the second shipment and expect a conflict.
   */
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: `${RandomGenerator.alphabets(8)}@test.com` satisfies string,
      password: "password123",
    } satisfies IMallPlatformSeller.IJoin,
  });
  typia.assert(seller);
  const createShipmentBody = (): IMallPlatformShipment.ICreate => ({
    shipmentItems: [
      {
        orderItemIds: [typia.random<string & tags.Format<"uuid">>()],
      } satisfies IMallPlatformShipmentItem.ICreate,
    ],
    carrierName: RandomGenerator.name(2),
    trackingNumber: RandomGenerator.alphaNumeric(12),
  });
  const firstShipment =
    await generate_random_mall_platform_seller_shipments_create(
      sellerConnection,
      {
        body: createShipmentBody(),
      },
    );
  typia.assert(firstShipment);
  const secondShipment =
    await generate_random_mall_platform_seller_shipments_create(
      sellerConnection,
      {
        body: createShipmentBody(),
      },
    );
  typia.assert(secondShipment);
  const firstShipmentItem = firstShipment.shipmentItems[0];
  TestValidator.predicate(
    "first shipment must include at least one shipment item",
    () => firstShipmentItem !== undefined,
  );
  if (firstShipmentItem === undefined) return;
  const orderItemId = firstShipmentItem.orderItem.id;
  await TestValidator.error(
    "duplicate shipment item assignment should be rejected",
    async () => {
      await api.functional.mallPlatform.seller.shipments.shipmentItems.create(
        sellerConnection,
        {
          shipmentId: secondShipment.id,
          body: {
            orderItemIds: [orderItemId],
          } satisfies IMallPlatformShipmentItem.ICreate,
        },
      );
    },
  );
  const originalAssignment =
    await api.functional.mallPlatform.seller.shipments.shipmentItems.create(
      sellerConnection,
      {
        shipmentId: firstShipment.id,
        body: {
          orderItemIds: [orderItemId],
        } satisfies IMallPlatformShipmentItem.ICreate,
      },
    );
  typia.assert(originalAssignment);
  TestValidator.equals(
    "original shipment remains the same",
    originalAssignment.shipment.id,
    firstShipment.id,
  );
  TestValidator.equals(
    "order item remains the same",
    originalAssignment.orderItem.id,
    orderItemId,
  );
}
