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

export async function test_api_shipment_detail_retrieve_own_shipment(
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
        carrierName: RandomGenerator.name(),
        trackingNumber: RandomGenerator.alphaNumeric(12),
        trackingUrl: `https://tracking.example.com/${RandomGenerator.alphaNumeric(10)}`,
        orderItemIds: [typia.random<string>()],
      } satisfies IMallPlatformShipment.ICreate,
    },
  );
  typia.assert(shipment);
  const retrieved = await api.functional.mallPlatform.seller.shipments.at(
    sellerConnection,
    {
      shipmentId: shipment.id,
    },
  );
  typia.assert(retrieved);
  TestValidator.equals("shipment id", retrieved.id, shipment.id);
  TestValidator.equals("shipment seller", retrieved.seller, shipment.seller);
  TestValidator.equals("shipment order", retrieved.order, shipment.order);
  TestValidator.equals(
    "shipment carrier name",
    retrieved.carrierName,
    shipment.carrierName,
  );
  TestValidator.equals(
    "shipment tracking number",
    retrieved.trackingNumber,
    shipment.trackingNumber,
  );
  TestValidator.equals(
    "shipment tracking url",
    retrieved.trackingUrl,
    shipment.trackingUrl,
  );
  TestValidator.equals("shipment status", retrieved.status, shipment.status);
  TestValidator.equals(
    "shipment shipped at",
    retrieved.shippedAt,
    shipment.shippedAt,
  );
  TestValidator.equals(
    "shipment delivered at",
    retrieved.deliveredAt,
    shipment.deliveredAt,
  );
  TestValidator.equals(
    "shipment created at",
    retrieved.createdAt,
    shipment.createdAt,
  );
  TestValidator.equals(
    "shipment updated at",
    retrieved.updatedAt,
    shipment.updatedAt,
  );
  TestValidator.equals(
    "shipment deleted at",
    retrieved.deletedAt,
    shipment.deletedAt,
  );
}
