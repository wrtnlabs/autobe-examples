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

export async function test_api_shipment_item_update_reject_cross_seller_reassignment(
  connection: api.IConnection,
): Promise<void> {
  const sellerAConnection: api.IConnection = { host: connection.host };
  const sellerAAuth = await authorize_seller_join(sellerAConnection, {
    body: {
      email: `${RandomGenerator.alphaNumeric(12)}@test.com`,
      password: `${RandomGenerator.alphaNumeric(10)}Aa1!`,
      href: "https://example.com/register",
      referrer: "https://example.com/landing",
      ip: "127.0.0.1",
    } satisfies IMallPlatformSeller.IJoin,
  });
  typia.assert(sellerAAuth);
  const sellerBConnection: api.IConnection = { host: connection.host };
  const sellerBAuth = await authorize_seller_join(sellerBConnection, {
    body: {
      email: `${RandomGenerator.alphaNumeric(12)}@test.com`,
      password: `${RandomGenerator.alphaNumeric(10)}Bb2!`,
      href: "https://example.com/register",
      referrer: "https://example.com/landing",
      ip: "127.0.0.1",
    } satisfies IMallPlatformSeller.IJoin,
  });
  typia.assert(sellerBAuth);
  const sellerAShipmentConnection: api.IConnection = { host: connection.host };
  sellerAShipmentConnection.headers = {
    Authorization: sellerAAuth.token.access,
  };
  const sellerBShipmentConnection: api.IConnection = { host: connection.host };
  sellerBShipmentConnection.headers = {
    Authorization: sellerBAuth.token.access,
  };
  const sellerAShipment =
    await api.functional.mallPlatform.seller.shipments.create(
      sellerAShipmentConnection,
      {
        body: {
          mallPlatformOrderId: typia.random<string & tags.Format<"uuid">>(),
          carrierName: RandomGenerator.name(),
          trackingNumber: RandomGenerator.alphaNumeric(16),
          shipmentItems: [
            {
              orderItemId: typia.random<string & tags.Format<"uuid">>(),
            } satisfies IMallPlatformShipmentItem.ICreate,
          ],
        } satisfies IMallPlatformShipment.ICreate,
      },
    );
  typia.assert(sellerAShipment);
  const sellerBShipment =
    await api.functional.mallPlatform.seller.shipments.create(
      sellerBShipmentConnection,
      {
        body: {
          mallPlatformOrderId: typia.random<string & tags.Format<"uuid">>(),
          carrierName: RandomGenerator.name(),
          trackingNumber: RandomGenerator.alphaNumeric(16),
          shipmentItems: [
            {
              orderItemId: typia.random<string & tags.Format<"uuid">>(),
            } satisfies IMallPlatformShipmentItem.ICreate,
          ],
        } satisfies IMallPlatformShipment.ICreate,
      },
    );
  typia.assert(sellerBShipment);
  await TestValidator.httpError(
    "cross-seller shipment item reassignment must be rejected",
    [403, 409],
    async () => {
      await api.functional.mallPlatform.seller.shipments.items.update(
        sellerAShipmentConnection,
        {
          shipmentId: typia.assert<string & tags.Format<"uuid">>(sellerBShipment.id),
          shipmentItemId: typia.random<string & tags.Format<"uuid">>(),
          body: {} satisfies IMallPlatformShipmentItem.IUpdate,
        },
      );
    },
  );
}
