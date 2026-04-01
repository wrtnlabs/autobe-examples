import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import type { IMallPlatformOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrder";
import type { IMallPlatformOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrderItem";
import type { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import type { IMallPlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariant";
import type { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import type { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
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

export async function test_api_shipment_item_update_by_owner_seller(
  connection: api.IConnection,
): Promise<void> {
  const sellerConnection: api.IConnection = { host: connection.host };
  const credentials = {
    email: `${RandomGenerator.alphabets(8)}@test.com`,
    password: RandomGenerator.alphaNumeric(12) + "!A1",
    href: "https://example.com/register",
    referrer: "https://example.com",
  } satisfies IMallPlatformSeller.IJoin;
  const authorized = await authorize_seller_join(sellerConnection, {
    body: credentials,
  });
  typia.assert(authorized);
  const shipment = await generate_random_mall_platform_seller_shipments_create(
    sellerConnection,
    {
      body: {
        mallPlatformOrderId: typia.random<string & tags.Format<"uuid">>(),
        carrierName: RandomGenerator.name(2),
        trackingNumber: RandomGenerator.alphaNumeric(12),
        shipmentItems: [
          {
            orderItemId: typia.random<string & tags.Format<"uuid">>(),
          },
        ] satisfies IMallPlatformShipmentItem.ICreate[],
      } satisfies IMallPlatformShipment.ICreate,
    },
  );
  typia.assert(shipment);
  const shipmentId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const shipmentItemId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const updated =
    await api.functional.mallPlatform.seller.shipments.items.update(
      sellerConnection,
      {
        shipmentId,
        shipmentItemId,
        body: {} satisfies IMallPlatformShipmentItem.IUpdate,
      },
    );
  typia.assert(updated);
  TestValidator.equals(
    "shipment relationship is preserved",
    updated.shipment.id,
    updated.shipment.id,
  );
  TestValidator.equals(
    "order item relationship is preserved",
    updated.orderItem.id,
    updated.orderItem.id,
  );
  TestValidator.predicate(
    "shipment and order item references exist",
    updated.shipment !== null && updated.orderItem !== null,
  );
}
