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

export async function test_api_shipment_item_reassignment_to_same_seller_shipment(
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
  const shipment1 = await generate_random_mall_platform_seller_shipments_create(
    sellerConnection,
    {
      body: {
        carrierName: RandomGenerator.name(),
        trackingNumber: RandomGenerator.alphaNumeric(12),
        trackingUrl: null,
        orderItemIds: [typia.random<string & tags.Format<"uuid">>()],
      } satisfies IMallPlatformShipment.ICreate,
    },
  );
  typia.assert(shipment1);
  const shipment2 = await generate_random_mall_platform_seller_shipments_create(
    sellerConnection,
    {
      body: {
        carrierName: RandomGenerator.name(),
        trackingNumber: RandomGenerator.alphaNumeric(12),
        trackingUrl: null,
        orderItemIds: [typia.random<string & tags.Format<"uuid">>()],
      } satisfies IMallPlatformShipment.ICreate,
    },
  );
  typia.assert(shipment2);
  const shipmentItem =
    await generate_random_mall_platform_seller_shipments_items_create(
      sellerConnection,
      {
        params: {
          shipmentId: shipment1.id,
        },
        body: {
          orderItemIds: [typia.random<string & tags.Format<"uuid">>()],
        } satisfies IMallPlatformShipmentItem.ICreate,
      },
    );
  typia.assert(shipmentItem);
  const beforeShipment1 = shipment1;
  const beforeShipment2 = shipment2;
  const beforeShipmentItem = shipmentItem;
  const updated =
    await api.functional.mallPlatform.seller.shipments.items.putByShipmentidAndShipmentitemid(
      sellerConnection,
      {
        shipmentId: shipment1.id,
        shipmentItemId: shipmentItem.id,
        body: {
          shipmentId: shipment2.id,
        } satisfies IMallPlatformShipmentItem.IUpdate,
      },
    );
  typia.assert(updated);
  TestValidator.equals(
    "shipment item id preserved",
    updated.id,
    beforeShipmentItem.id,
  );
  TestValidator.equals(
    "shipment item moved to target shipment",
    updated.shipment.id,
    beforeShipment2.id,
  );
  TestValidator.equals(
    "shipment item keeps same order item",
    updated.orderItem.id,
    beforeShipmentItem.orderItem.id,
  );
  TestValidator.equals(
    "source shipment header remains unchanged",
    shipment1,
    beforeShipment1,
  );
  TestValidator.equals(
    "target shipment header remains unchanged",
    shipment2,
    beforeShipment2,
  );
  TestValidator.notEquals(
    "updatedAt should refresh",
    updated.updatedAt,
    beforeShipmentItem.updatedAt,
  );
  TestValidator.equals(
    "createdAt should remain stable",
    updated.createdAt,
    beforeShipmentItem.createdAt,
  );
  TestValidator.equals(
    "deletedAt should remain stable",
    updated.deletedAt,
    beforeShipmentItem.deletedAt,
  );
}
