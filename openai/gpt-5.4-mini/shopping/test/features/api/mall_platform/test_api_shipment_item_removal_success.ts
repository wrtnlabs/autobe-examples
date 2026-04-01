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

export async function test_api_shipment_item_removal_success(
  connection: api.IConnection,
): Promise<void> {
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: `${RandomGenerator.alphabets(8)}@test.com`,
      password: "Password123!" as string & tags.Format<"password">,
      href: "https://example.com/register",
      referrer: "https://example.com/landing",
      ip: "127.0.0.1",
    } satisfies IMallPlatformSeller.IJoin,
  });
  sellerConnection.headers = {
    Authorization: sellerAuth.token.access,
  };
  const shipment: IMallPlatformShipment =
    await generate_random_mall_platform_seller_shipments_create(
      sellerConnection,
      {
        body: {
          mallPlatformOrderId: typia.random<string & tags.Format<"uuid">>(),
          carrierName: RandomGenerator.name(),
          trackingNumber: RandomGenerator.alphaNumeric(12),
          shipmentItems: ArrayUtil.repeat(2, () => ({
            orderItemId: typia.random<string & tags.Format<"uuid">>(),
          })),
        },
      },
    );
  typia.assert(shipment);
  await api.functional.mallPlatform.seller.shipments.items.erase(
    sellerConnection,
    {
      shipmentId: typia.random<string & tags.Format<"uuid">>(),
      shipmentItemId: typia.random<string & tags.Format<"uuid">>(),
    },
  );
  TestValidator.predicate("shipment response is present", !!shipment);
  TestValidator.predicate(
    "shipment order summary is present",
    !!shipment.order,
  );
  TestValidator.predicate(
    "shipment seller summary is present",
    !!shipment.seller,
  );
  typia.assert(shipment.order);
  typia.assert(shipment.seller);
}
