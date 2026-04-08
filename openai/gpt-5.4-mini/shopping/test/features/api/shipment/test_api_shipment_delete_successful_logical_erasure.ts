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

export async function test_api_shipment_delete_successful_logical_erasure(
  connection: api.IConnection,
): Promise<void> {
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
    } satisfies IMallPlatformSeller.IJoin,
  });
  const administratorConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(administratorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
    } satisfies IMallPlatformAdministrator.IJoin,
  });
  const shipment: IMallPlatformShipment =
    await generate_random_mall_platform_seller_shipments_create(
      sellerConnection,
      {
        body: {
          carrierName: RandomGenerator.name(),
          trackingNumber: RandomGenerator.alphaNumeric(12),
          shipmentItems: [
            {
              orderItemIds: [typia.random<string & tags.Format<"uuid">>()],
            } satisfies IMallPlatformShipmentItem.ICreate,
          ],
        } satisfies IMallPlatformShipment.ICreate,
      },
    );
  typia.assert(shipment);
  const shipmentSnapshot = {
    id: shipment.id,
    carrierName: shipment.carrierName,
    trackingNumber: shipment.trackingNumber,
    trackingUrl: shipment.trackingUrl,
    status: shipment.status,
    shippedAt: shipment.shippedAt,
    deliveredAt: shipment.deliveredAt,
    deletedAt: shipment.deletedAt,
    shipmentItemCount: shipment.shipmentItems.length,
    shipmentItemIds: shipment.shipmentItems.map((item) => item.id),
  };
  await api.functional.mallPlatform.administrator.shipments.erase(
    administratorConnection,
    {
      shipmentId: shipment.id,
    },
  );
  TestValidator.predicate(
    "shipment was created with at least one shipment item",
    shipmentSnapshot.shipmentItemCount > 0,
  );
  TestValidator.predicate(
    "shipment identifier is a UUID-like value before deletion",
    shipmentSnapshot.id.length > 0,
  );
  TestValidator.predicate(
    "shipment tracking information exists before deletion",
    shipmentSnapshot.carrierName.length > 0 &&
      shipmentSnapshot.trackingNumber.length > 0,
  );
  TestValidator.equals(
    "carrier name snapshot remains unchanged",
    shipmentSnapshot.carrierName,
    shipment.carrierName,
  );
  TestValidator.equals(
    "tracking number snapshot remains unchanged",
    shipmentSnapshot.trackingNumber,
    shipment.trackingNumber,
  );
  TestValidator.equals(
    "tracking url snapshot remains unchanged",
    shipmentSnapshot.trackingUrl,
    shipment.trackingUrl,
  );
  TestValidator.equals(
    "status snapshot remains unchanged",
    shipmentSnapshot.status,
    shipment.status,
  );
  TestValidator.equals(
    "shippedAt snapshot remains unchanged",
    shipmentSnapshot.shippedAt,
    shipment.shippedAt,
  );
  TestValidator.equals(
    "deliveredAt snapshot remains unchanged",
    shipmentSnapshot.deliveredAt,
    shipment.deliveredAt,
  );
  TestValidator.equals(
    "deletedAt snapshot remains unchanged locally",
    shipmentSnapshot.deletedAt,
    shipment.deletedAt,
  );
  TestValidator.predicate(
    "shipment-item ids were captured before deletion",
    shipmentSnapshot.shipmentItemIds.length > 0,
  );
}
