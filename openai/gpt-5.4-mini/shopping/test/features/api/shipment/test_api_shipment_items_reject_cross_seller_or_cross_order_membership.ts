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

export async function test_api_shipment_items_reject_cross_seller_or_cross_order_membership(
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
        orderItemIds: ArrayUtil.repeat(1, () =>
          typia.random<string & tags.Format<"uuid">>(),
        ),
      },
    },
  );
  typia.assert(shipment);
  await TestValidator.error(
    "shipment item membership update should reject cross-seller or cross-order items",
    async () => {
      await api.functional.mallPlatform.seller.shipments.items.patchByShipmentid(
        sellerConnection,
        {
          shipmentId: shipment.id,
          body: {
            orderItemIds: ArrayUtil.repeat(2, () =>
              typia.random<string & tags.Format<"uuid">>(),
            ),
          } satisfies IMallPlatformShipment.IUpdateItem,
        },
      );
    },
  );
}
