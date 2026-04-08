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

export async function test_api_shipment_items_reject_completed_shipment_update(
  connection: api.IConnection,
): Promise<void> {
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: `${RandomGenerator.alphaNumeric(8)}@test.com` as any,
      password: RandomGenerator.alphaNumeric(12) as any,
    } as IMallPlatformSeller.IJoin,
  });
  const eligibleItems =
    await api.functional.mallPlatform.seller.shipments.eligible_order_items.index(
      sellerConnection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies IMallPlatformOrderItem.IRequest,
      },
    );
  typia.assert(eligibleItems);
  if (eligibleItems.data.length === 0) return;
  const shipment = await api.functional.mallPlatform.seller.shipments.create(
    sellerConnection,
    {
      body: {
        shipmentItems: [{ orderItemIds: [eligibleItems.data[0].id] }],
        carrierName: RandomGenerator.name(),
        trackingNumber: RandomGenerator.alphaNumeric(16),
      } satisfies IMallPlatformShipment.ICreate,
    },
  );
  typia.assert(shipment);
  const shipmentId = shipment.id;
  const originalItemIds = shipment.shipmentItems.map(
    (item) => item.orderItem.id,
  );
  await TestValidator.error(
    "completed shipment rejects shipment item replacement",
    async () => {
      await api.functional.mallPlatform.seller.shipments.shipmentItems.index(
        sellerConnection,
        {
          shipmentId,
          body: {
            orderItemIds: originalItemIds,
          } satisfies IMallPlatformShipmentItem.IUpdate,
        },
      );
    },
  );
  const afterAttempt =
    await api.functional.mallPlatform.seller.shipments.shipmentItems.index(
      sellerConnection,
      {
        shipmentId,
        body: {
          orderItemIds: originalItemIds,
        } satisfies IMallPlatformShipmentItem.IUpdate,
      },
    );
  typia.assert(afterAttempt);
  TestValidator.equals(
    "shipment items remain unchanged after rejected update",
    afterAttempt.data.map((item) => item.orderItem.id),
    originalItemIds,
  );
}
