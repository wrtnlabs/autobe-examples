import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministrator";
import type { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import type { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
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

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { generate_random_mall_platform_administrator_shipments_items_create } from "../../../generate/generate_random_mall_platform_administrator_shipments_items_create";
import { prepare_random_mall_platform_shipment_item } from "../../../prepare/prepare_random_mall_platform_shipment_item";

export async function test_api_shipment_items_reject_cross_seller_items(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Reject shipment item creation when order items belong to different sellers.
   *
   * This test validates the platform's shipment ownership rule by ensuring a
   * shipment-item creation request cannot mix order items from multiple sellers.
   * It also confirms the operation fails atomically so no partial shipment-item
   * assignment is preserved when the request is invalid.
   *
   * 1. Create a dedicated administrator session from the base connection.
   * 2. Create or reuse a shipment context owned by one seller.
   * 3. Prepare a mixed set of order items from different sellers.
   * 4. Attempt shipment-item creation and verify the request is rejected.
   */
  const administratorConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(administratorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies IMallPlatformAdministrator.IJoin,
  });
  const shipmentId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const sameSellerOrderItemId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const otherSellerOrderItemId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const request = {
    orderItemIds: [sameSellerOrderItemId, otherSellerOrderItemId],
  } satisfies IMallPlatformShipmentItem.ICreate;
  await TestValidator.error(
    "reject mixed-seller shipment item assignment",
    async () => {
      await api.functional.mallPlatform.administrator.shipments.items.create(
        administratorConnection,
        {
          shipmentId,
          body: request,
        },
      );
    },
  );
}
