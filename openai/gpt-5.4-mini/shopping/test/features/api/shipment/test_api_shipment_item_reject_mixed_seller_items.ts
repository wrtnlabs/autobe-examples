import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import type { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import type { IMallPlatformOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrder";
import type { IMallPlatformOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrderItem";
import type { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import type { IMallPlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariant";
import type { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import type { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
import type { IMallPlatformSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerProfile";
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

export async function test_api_shipment_item_reject_mixed_seller_items(
  connection: api.IConnection,
): Promise<void> {
  const ownerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IMallPlatformSeller.IJoin,
  });
  const shipment = await generate_random_mall_platform_seller_shipments_create(
    ownerConnection,
    {
      body: {
        carrierName: RandomGenerator.name(),
        trackingNumber: RandomGenerator.alphaNumeric(12),
        trackingUrl: null,
        orderItemIds: [typia.random<string & tags.Format<"uuid">>()],
      } satisfies IMallPlatformShipment.ICreate,
    },
  );
  typia.assert(shipment);
  const mixedOrderItemIds = [
    typia.random<string & tags.Format<"uuid">>(),
    typia.random<string & tags.Format<"uuid">>(),
  ] satisfies (string & tags.Format<"uuid">)[];
  await TestValidator.error(
    "mixed seller order items should be rejected for a shipment",
    async () => {
      await api.functional.mallPlatform.seller.shipments.items.create(
        ownerConnection,
        {
          shipmentId: shipment.id,
          body: {
            orderItemIds: mixedOrderItemIds,
          } satisfies IMallPlatformShipmentItem.ICreate,
        },
      );
    },
  );
  typia.assert(shipment);
  TestValidator.equals(
    "shipment id should remain the same after rejected attachment",
    shipment.id,
    shipment.id,
  );
  TestValidator.equals(
    "shipment carrier name should remain unchanged",
    shipment.carrierName,
    shipment.carrierName,
  );
  TestValidator.equals(
    "shipment tracking number should remain unchanged",
    shipment.trackingNumber,
    shipment.trackingNumber,
  );
}
