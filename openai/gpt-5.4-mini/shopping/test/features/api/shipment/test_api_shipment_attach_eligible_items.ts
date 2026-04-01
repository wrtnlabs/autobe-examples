import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrder";
import type { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
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

export async function test_api_shipment_attach_eligible_items(
  connection: api.IConnection,
): Promise<void> {
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Password123!",
      href: "https://example.com/register",
      referrer: "https://example.com/landing",
      ip: "127.0.0.1",
    } satisfies IMallPlatformSeller.IJoin,
  });
  typia.assert(seller);
  const shipment = await generate_random_mall_platform_seller_shipments_create(
    sellerConnection,
    {
      body: {
        mallPlatformOrderId: typia.random<string & tags.Format<"uuid">>(),
        carrierName: RandomGenerator.name(),
        trackingNumber: RandomGenerator.alphaNumeric(12),
        trackingUrl: "https://tracking.example.com/parcel/1",
        shipmentItems: [
          {
            orderItemId: typia.random<string & tags.Format<"uuid">>(),
          } satisfies IMallPlatformShipmentItem.ICreate,
        ],
      },
    },
  );
  typia.assert(shipment);
  const shipmentId = typia.random<string & tags.Format<"uuid">>();
  const attached =
    await generate_random_mall_platform_seller_shipments_items_create(
      sellerConnection,
      {
        params: {
          shipmentId,
        },
        body: {
          orderItemId: typia.random<string & tags.Format<"uuid">>(),
        },
      },
    );
  typia.assert(attached);
  TestValidator.predicate(
    "shipment response should contain seller context",
    () => attached.seller.id === seller.id,
  );
  TestValidator.predicate(
    "shipment response should retain tracking data",
    () =>
      attached.tracking_number !== null &&
      attached.carrier_name !== null &&
      attached.status !== null,
  );
  TestValidator.predicate(
    "shipment ids should be available as identifiers",
    () => shipmentId.length > 0,
  );
}
