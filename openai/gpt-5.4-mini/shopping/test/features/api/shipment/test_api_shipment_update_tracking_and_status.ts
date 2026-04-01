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

export async function test_api_shipment_update_tracking_and_status(
  connection: api.IConnection,
): Promise<void> {
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: "https://example.com/seller/join",
      referrer: "https://example.com/",
      ip: "127.0.0.1",
    } satisfies IMallPlatformSeller.IJoin,
  });
  typia.assert(seller);
  const createdShipment =
    await generate_random_mall_platform_seller_shipments_create(
      sellerConnection,
      {
        body: {
          carrierName: RandomGenerator.name(2),
          trackingNumber: RandomGenerator.alphaNumeric(12),
          trackingUrl: "https://example.com/tracking/initial",
        },
      },
    );
  typia.assert(createdShipment);
  const initialOrderId = createdShipment.order.id;
  const initialSellerId = createdShipment.seller.id;
  const initialShipment = createdShipment;
  const initialShipmentId = typia.random<string & tags.Format<"uuid">>();
  TestValidator.equals(
    "shipment seller id",
    createdShipment.seller.id,
    seller.id,
  );
  TestValidator.equals(
    "shipment seller email",
    createdShipment.seller.email,
    seller.email,
  );
  TestValidator.equals(
    "shipment order id is preserved",
    createdShipment.order.id,
    initialOrderId,
  );
  const updatedToShipped =
    await api.functional.mallPlatform.seller.shipments.update(
      sellerConnection,
      {
        shipmentId: initialShipmentId,
        body: {
          carrierName: RandomGenerator.name(2) + " Express",
          trackingNumber: RandomGenerator.alphaNumeric(16),
          trackingUrl: "https://example.com/tracking/shipped",
          status: "shipped",
        } satisfies IMallPlatformShipment.IUpdate,
      },
    );
  typia.assert(updatedToShipped);
  TestValidator.equals(
    "shipment order preserved after shipped update",
    updatedToShipped.order.id,
    initialOrderId,
  );
  TestValidator.equals(
    "shipment seller preserved after shipped update",
    updatedToShipped.seller.id,
    initialSellerId,
  );
  TestValidator.equals(
    "shipment order grouping preserved after shipped update",
    updatedToShipped.order.id,
    initialShipment.order.id,
  );
  TestValidator.equals(
    "shipment seller grouping preserved after shipped update",
    updatedToShipped.seller.id,
    initialShipment.seller.id,
  );
  const updatedToDelivered =
    await api.functional.mallPlatform.seller.shipments.update(
      sellerConnection,
      {
        shipmentId: initialShipmentId,
        body: {
          carrierName: RandomGenerator.name(2) + " Logistics",
          trackingNumber: RandomGenerator.alphaNumeric(18),
          trackingUrl: "https://example.com/tracking/delivered",
          status: "delivered",
        } satisfies IMallPlatformShipment.IUpdate,
      },
    );
  typia.assert(updatedToDelivered);
  TestValidator.equals(
    "shipment order preserved after delivered update",
    updatedToDelivered.order.id,
    initialOrderId,
  );
  TestValidator.equals(
    "shipment seller preserved after delivered update",
    updatedToDelivered.seller.id,
    initialSellerId,
  );
  TestValidator.equals(
    "shipment order grouping preserved after delivered update",
    updatedToDelivered.order.id,
    initialShipment.order.id,
  );
  TestValidator.equals(
    "shipment seller grouping preserved after delivered update",
    updatedToDelivered.seller.id,
    initialShipment.seller.id,
  );
}
