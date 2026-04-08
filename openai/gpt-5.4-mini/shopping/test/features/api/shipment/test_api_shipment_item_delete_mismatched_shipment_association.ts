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

/**
 * Verify that deleting a shipment-item association with the wrong shipment identifier fails.
 *
 * This test covers the administrator shipment maintenance path by creating two separate seller shipments,
 * then intentionally mixing the shipment identifier from one package with the shipment-item identifier
 * from the other package. The delete request must reject the mismatched association as not found,
 * proving that shipment-item links cannot be removed from the wrong shipment.
 *
 * 1. Authenticate an administrator and a seller using isolated actor-specific connections.
 * 2. Create two distinct shipments for the seller and capture their shipment-item associations.
 * 3. Attempt to delete a shipment-item using a shipmentId from the other shipment.
 * 4. Confirm the operation fails with a not-found HTTP error.
 */
export async function test_api_shipment_item_delete_mismatched_shipment_association(
  connection: api.IConnection,
): Promise<void> {
  const administratorConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(administratorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies IMallPlatformAdministrator.IJoin,
  });
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies IMallPlatformSeller.IJoin,
  });
  const shipmentOne =
    await generate_random_mall_platform_seller_shipments_create(
      sellerConnection,
      {
        body: {
          carrierName: RandomGenerator.name(),
          trackingNumber: RandomGenerator.alphaNumeric(12),
          shipmentItems: [
            {
              orderItemIds: [typia.random<string & tags.Format<"uuid">>()],
            },
          ],
        } satisfies IMallPlatformShipment.ICreate,
      },
    );
  typia.assert(shipmentOne);
  const shipmentTwo =
    await generate_random_mall_platform_seller_shipments_create(
      sellerConnection,
      {
        body: {
          carrierName: RandomGenerator.name(),
          trackingNumber: RandomGenerator.alphaNumeric(12),
          shipmentItems: [
            {
              orderItemIds: [typia.random<string & tags.Format<"uuid">>()],
            },
          ],
        } satisfies IMallPlatformShipment.ICreate,
      },
    );
  typia.assert(shipmentTwo);
  TestValidator.predicate(
    "shipments used for the mismatch test should be distinct",
    shipmentOne.id !== shipmentTwo.id,
  );
  TestValidator.predicate(
    "shipment one must include at least one shipment item",
    shipmentOne.shipmentItems.length > 0,
  );
  TestValidator.predicate(
    "shipment two must include at least one shipment item",
    shipmentTwo.shipmentItems.length > 0,
  );
  const shipmentId = shipmentOne.id;
  const shipmentItemId = shipmentTwo.shipmentItems[0]!.id;
  await TestValidator.httpError(
    "mismatched shipment-item deletion should return not-found",
    [404],
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
}
