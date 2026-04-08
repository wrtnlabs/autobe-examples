import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_mall_platform_seller_shipments_create } from "../../../generate/generate_random_mall_platform_seller_shipments_create";
import { prepare_random_mall_platform_shipment } from "../../../prepare/prepare_random_mall_platform_shipment";
import { prepare_random_mall_platform_shipment_item } from "../../../prepare/prepare_random_mall_platform_shipment_item";

export async function test_api_shipment_item_retrieve_by_shipment(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Verify seller shipment-item retrieval by shipment context.
   *
   * 1. Register and authenticate a seller account using an isolated connection.
   * 2. Create a shipment with at least one shipment item owned by that seller.
   * 3. Retrieve the shipment-item association through the shipment-scoped endpoint.
   * 4. Validate the returned association and confirm the lookup is read-only.
   */
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
    } satisfies IMallPlatformSeller.IJoin,
  });
  typia.assert(sellerAuth);
  sellerConnection.headers = {
    Authorization: sellerAuth.token.access,
  };
  const createdShipment =
    await api.functional.mallPlatform.seller.shipments.create(
      sellerConnection,
      {
        body: {
          shipmentItems: [
            {
              orderItemIds: [typia.random<string & tags.Format<"uuid">>()],
            } satisfies IMallPlatformShipmentItem.ICreate,
          ],
          carrierName: RandomGenerator.name(),
          trackingNumber: RandomGenerator.alphaNumeric(12),
        } satisfies IMallPlatformShipment.ICreate,
      },
    );
  typia.assert(createdShipment);
  TestValidator.predicate(
    "shipment has shipment items",
    createdShipment.shipmentItems.length > 0,
  );
  const targetShipmentItem = createdShipment.shipmentItems[0]!;
  const snapshotBefore = {
    shipmentId: createdShipment.id,
    shipmentStatus: createdShipment.status,
    trackingNumber: createdShipment.trackingNumber,
    trackingUrl: createdShipment.trackingUrl,
    shipmentItemId: targetShipmentItem.id,
    orderItemId: targetShipmentItem.orderItem.id,
    orderItemStatus: targetShipmentItem.orderItem.status,
    orderItemQuantity: targetShipmentItem.orderItem.quantity,
    shipmentItemDeletedAt: targetShipmentItem.deleted_at,
  };
  const retrievedShipmentItem =
    await api.functional.mallPlatform.seller.shipments.shipmentItems.at(
      sellerConnection,
      {
        shipmentId: createdShipment.id,
        shipmentItemId: targetShipmentItem.id,
      },
    );
  typia.assert(retrievedShipmentItem);
  TestValidator.equals(
    "shipment item id matches",
    retrievedShipmentItem.id,
    snapshotBefore.shipmentItemId,
  );
  TestValidator.equals(
    "shipment association matches",
    retrievedShipmentItem.shipment.id,
    snapshotBefore.shipmentId,
  );
  TestValidator.equals(
    "shipment status is unchanged",
    createdShipment.status,
    snapshotBefore.shipmentStatus,
  );
  TestValidator.equals(
    "tracking number is unchanged",
    createdShipment.trackingNumber,
    snapshotBefore.trackingNumber,
  );
  TestValidator.equals(
    "tracking url is unchanged",
    createdShipment.trackingUrl,
    snapshotBefore.trackingUrl,
  );
  TestValidator.equals(
    "retrieved shipment id matches request path",
    retrievedShipmentItem.shipment.id,
    createdShipment.id,
  );
  TestValidator.equals(
    "retrieved shipment carrier matches",
    retrievedShipmentItem.shipment.carrierName,
    createdShipment.carrierName,
  );
  TestValidator.equals(
    "retrieved shipment tracking number matches",
    retrievedShipmentItem.shipment.trackingNumber,
    createdShipment.trackingNumber,
  );
  TestValidator.equals(
    "retrieved shipment status matches created shipment",
    retrievedShipmentItem.shipment.status,
    createdShipment.status,
  );
  TestValidator.equals(
    "retrieved shipment deleted flag matches",
    retrievedShipmentItem.shipment.deletedAt,
    createdShipment.deletedAt,
  );
  TestValidator.equals(
    "retrieved order item id matches",
    retrievedShipmentItem.orderItem.id,
    snapshotBefore.orderItemId,
  );
  TestValidator.equals(
    "retrieved order item status matches",
    retrievedShipmentItem.orderItem.status,
    snapshotBefore.orderItemStatus,
  );
  TestValidator.equals(
    "retrieved order item quantity matches",
    retrievedShipmentItem.orderItem.quantity,
    snapshotBefore.orderItemQuantity,
  );
  TestValidator.equals(
    "shipment item not deleted",
    retrievedShipmentItem.deleted_at,
    snapshotBefore.shipmentItemDeletedAt,
  );
}
