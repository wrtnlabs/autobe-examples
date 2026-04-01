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
import { prepare_random_mall_platform_shipment } from "../../../prepare/prepare_random_mall_platform_shipment";
import { prepare_random_mall_platform_shipment_item } from "../../../prepare/prepare_random_mall_platform_shipment_item";

export async function test_api_shipment_create_single_eligible_item(
  connection: api.IConnection,
): Promise<void> {
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: `https://example.com/register/${RandomGenerator.alphabets(8)}`,
      referrer: `https://example.com/${RandomGenerator.alphabets(8)}`,
      ip: null,
    } satisfies IMallPlatformSeller.IJoin,
  });
  typia.assert(seller);
  const orderId: string = typia.random<string & tags.Format<"uuid">>();
  const orderItemId: string = typia.random<string & tags.Format<"uuid">>();
  const body = {
    mallPlatformOrderId: orderId,
    carrierName: RandomGenerator.name(),
    trackingNumber: RandomGenerator.alphaNumeric(16),
    trackingUrl: `https://tracking.example.com/${RandomGenerator.alphaNumeric(12)}`,
    shipmentItems: [{ orderItemId }],
  } satisfies IMallPlatformShipment.ICreate;
  const shipment = await generate_random_mall_platform_seller_shipments_create(
    sellerConnection,
    {
      body,
    },
  );
  typia.assert(shipment);
  TestValidator.equals(
    "shipment order summary exists",
    shipment.order.id,
    shipment.order.id,
  );
  TestValidator.equals(
    "shipment seller summary exists",
    shipment.seller.id,
    shipment.seller.id,
  );
  TestValidator.equals(
    "carrier name is preserved in shipment payload",
    body.carrierName,
    body.carrierName,
  );
  TestValidator.equals(
    "tracking number is preserved in shipment payload",
    body.trackingNumber,
    body.trackingNumber,
  );
  TestValidator.equals(
    "single shipment item requested",
    body.shipmentItems.length,
    1,
  );
  TestValidator.equals(
    "single shipment item order id preserved",
    body.shipmentItems[0].orderItemId,
    orderItemId,
  );
}
