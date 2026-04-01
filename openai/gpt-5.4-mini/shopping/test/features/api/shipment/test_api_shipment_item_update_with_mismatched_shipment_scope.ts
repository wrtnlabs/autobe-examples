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

export async function test_api_shipment_item_update_with_mismatched_shipment_scope(
  connection: api.IConnection,
): Promise<void> {
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<(string & tags.Format<"ipv4">) | undefined>(),
    } satisfies IMallPlatformSeller.IJoin,
  });
  const firstShipment =
    await api.functional.mallPlatform.seller.shipments.create(
      sellerConnection,
      {
        body: {
          mallPlatformOrderId: typia.random<string & tags.Format<"uuid">>(),
          carrierName: RandomGenerator.name(),
          trackingNumber: RandomGenerator.alphaNumeric(12),
          shipmentItems: ArrayUtil.repeat(
            1,
            () =>
              ({
                orderItemId: typia.random<string & tags.Format<"uuid">>(),
              }) satisfies IMallPlatformShipmentItem.ICreate,
          ),
        } satisfies IMallPlatformShipment.ICreate,
      },
    );
  typia.assert(firstShipment);
  const secondShipment =
    await api.functional.mallPlatform.seller.shipments.create(
      sellerConnection,
      {
        body: {
          mallPlatformOrderId: typia.random<string & tags.Format<"uuid">>(),
          carrierName: RandomGenerator.name(),
          trackingNumber: RandomGenerator.alphaNumeric(12),
          shipmentItems: ArrayUtil.repeat(
            1,
            () =>
              ({
                orderItemId: typia.random<string & tags.Format<"uuid">>(),
              }) satisfies IMallPlatformShipmentItem.ICreate,
          ),
        } satisfies IMallPlatformShipment.ICreate,
      },
    );
  typia.assert(secondShipment);
  const mismatchShipmentId = typia.random<string & tags.Format<"uuid">>();
  const mismatchShipmentItemId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "shipment item update should reject mismatched shipment scope",
    [404, 409],
    async () => {
      await api.functional.mallPlatform.seller.shipments.items.update(
        sellerConnection,
        {
          shipmentId: mismatchShipmentId,
          shipmentItemId: mismatchShipmentItemId,
          body: {} satisfies IMallPlatformShipmentItem.IUpdate,
        },
      );
    },
  );
}
