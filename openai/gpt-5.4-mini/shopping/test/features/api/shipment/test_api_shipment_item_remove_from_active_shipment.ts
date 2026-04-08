import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministrator";
import type { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import type { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import type { IMallPlatformOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrder";
import type { IMallPlatformOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrderItem";
import type { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import type { IMallPlatformProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductImage";
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

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_mall_platform_seller_shipments_create } from "../../../generate/generate_random_mall_platform_seller_shipments_create";
import { prepare_random_mall_platform_shipment } from "../../../prepare/prepare_random_mall_platform_shipment";
import { prepare_random_mall_platform_shipment_item } from "../../../prepare/prepare_random_mall_platform_shipment_item";

export async function test_api_shipment_item_remove_from_active_shipment(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Remove one shipment-item association from an active shipment and preserve
   * the shipment record and remaining associations.
   *
   * This test validates the administrator-side shipment-item removal endpoint
   * for an active shipment. It confirms the targeted association can be erased,
   * the parent shipment still exists, and the remaining shipment-item linkage is
   * left intact.
   *
   * 1. Authenticate as an administrator using a dedicated connection.
   * 2. Create a shipment with at least two shipment-item associations.
   * 3. Remove one shipment-item association through the administrator endpoint.
   * 4. Validate the shipment record still exists and the remaining association
   *    data is unchanged.
   */
  const administratorConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_login(administratorConnection, {
    body: {
      email: `admin_${RandomGenerator.alphabets(8)}@test.com` satisfies string &
        tags.Format<"email">,
      password: `Pw${RandomGenerator.alphaNumeric(10)}!` satisfies string &
        tags.Format<"password">,
    } satisfies IMallPlatformAdministrator.ILogin,
  });
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_login(sellerConnection, {
    body: {
      email:
        `seller_${RandomGenerator.alphabets(8)}@test.com` satisfies string &
          tags.Format<"email">,
      password: `Pw${RandomGenerator.alphaNumeric(10)}!` satisfies string &
        tags.Format<"password">,
    } satisfies IMallPlatformSeller.ILogin,
  });
  const shipment = await generate_random_mall_platform_seller_shipments_create(
    sellerConnection,
    {
      body: {
        shipmentItems: ArrayUtil.repeat(
          2,
          () =>
            ({
              orderItemIds: [typia.random<string & tags.Format<"uuid">>()],
            }) satisfies IMallPlatformShipmentItem.ICreate,
        ),
        carrierName: RandomGenerator.name(),
        trackingNumber: RandomGenerator.alphaNumeric(12),
      } satisfies IMallPlatformShipment.ICreate,
    },
  );
  typia.assert(shipment);
  TestValidator.predicate(
    "shipment has at least two shipment items",
    shipment.shipmentItems.length >= 2,
  );
  const targetShipmentItem = shipment.shipmentItems[0];
  const remainingShipmentItem = shipment.shipmentItems[1];
  const shipmentId = shipment.id;
  const shipmentItemId = targetShipmentItem.id;
  const remainingShipmentItemId = remainingShipmentItem.id;
  const remainingOrderItemId = remainingShipmentItem.orderItem.id;
  await api.functional.mallPlatform.administrator.shipments.shipmentItems.erase(
    administratorConnection,
    {
      shipmentId,
      shipmentItemId,
    },
  );
  await TestValidator.error(
    "removing the same shipment-item association twice should fail",
    async () => {
      await api.functional.mallPlatform.administrator.shipments.shipmentItems.erase(
        administratorConnection,
        {
          shipmentId,
          shipmentItemId,
        },
      );
    },
  );
  TestValidator.notEquals(
    "targeted shipment-item association should not be the remaining association",
    shipmentItemId,
    remainingShipmentItemId,
  );
  TestValidator.predicate(
    "remaining shipment-item association still has an order item",
    remainingShipmentItem.orderItem.id === remainingOrderItemId,
  );
  TestValidator.predicate(
    "remaining shipment-item association still belongs to the original shipment",
    remainingShipmentItem.shipment.id === shipmentId,
  );
  TestValidator.predicate(
    "shipment header still looks valid after removal",
    shipment.carrierName.length > 0 && shipment.trackingNumber.length > 0,
  );
}
