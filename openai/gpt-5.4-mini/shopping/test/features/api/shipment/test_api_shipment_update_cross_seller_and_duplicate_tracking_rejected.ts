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

export async function test_api_shipment_update_cross_seller_and_duplicate_tracking_rejected(
  connection: api.IConnection,
): Promise<void> {
  const sellerAConnection: api.IConnection = { host: connection.host };
  const sellerBConnection: api.IConnection = { host: connection.host };
  const sellerA = await authorize_seller_join(sellerAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Password123!",
      href: "https://example.com/register",
      referrer: "https://example.com/landing",
      ip: "127.0.0.1",
    } satisfies IMallPlatformSeller.IJoin,
  });
  typia.assert(sellerA);
  const sellerB = await authorize_seller_join(sellerBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Password123!",
      href: "https://example.com/register",
      referrer: "https://example.com/landing",
      ip: "127.0.0.1",
    } satisfies IMallPlatformSeller.IJoin,
  });
  typia.assert(sellerB);
  const shipmentA = await generate_random_mall_platform_seller_shipments_create(
    sellerAConnection,
    {},
  );
  typia.assert(shipmentA);
  const shipmentB = await generate_random_mall_platform_seller_shipments_create(
    sellerBConnection,
    {},
  );
  typia.assert(shipmentB);
  const shipmentAId = typia.random<string & tags.Format<"uuid">>();
  const shipmentBId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "seller cannot update another seller's shipment",
    [401, 403, 404],
    async () => {
      await api.functional.mallPlatform.seller.shipments.update(
        sellerAConnection,
        {
          shipmentId: shipmentBId,
          body: {
            carrierName: RandomGenerator.name(),
            trackingNumber: RandomGenerator.alphaNumeric(12),
          } satisfies IMallPlatformShipment.IUpdate,
        },
      );
    },
  );
  await TestValidator.httpError(
    "duplicate tracking number within seller scope is rejected",
    [409, 422],
    async () => {
      await api.functional.mallPlatform.seller.shipments.update(
        sellerAConnection,
        {
          shipmentId: shipmentAId,
          body: {
            trackingNumber: RandomGenerator.alphaNumeric(12),
          } satisfies IMallPlatformShipment.IUpdate,
        },
      );
    },
  );
}
