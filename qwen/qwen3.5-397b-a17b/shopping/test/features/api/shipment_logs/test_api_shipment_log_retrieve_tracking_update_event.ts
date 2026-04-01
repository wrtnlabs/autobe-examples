import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import type { IShoppingMallShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipmentItem";
import type { IShoppingMallShipmentLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipmentLog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_seller_shipments_create } from "../../../generate/generate_random_shopping_mall_seller_shipments_create";
import { prepare_random_shopping_mall_shipment } from "../../../prepare/prepare_random_shopping_mall_shipment";

export async function test_api_shipment_log_retrieve_tracking_update_event(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(sellerAuth);
  // 2. Create a shipment with initial tracking information
  const shipment = await generate_random_shopping_mall_seller_shipments_create(
    sellerConnection,
    {
      body: {
        tracking_carrier: "FedEx",
        tracking_number: `TRACK${RandomGenerator.alphaNumeric(12)}`,
      } satisfies DeepPartial<IShoppingMallShipment.ICreate>,
    },
  );
  typia.assert(shipment);
  // 3. Store original tracking values for comparison
  const originalCarrier = shipment.tracking_carrier;
  const originalTrackingNumber = shipment.tracking_number;
  // 4. Update the shipment tracking information (generates tracking_updated log)
  const newCarrier = "UPS";
  const newTrackingNumber = `TRACK${RandomGenerator.alphaNumeric(12)}`;
  const updatedShipment =
    await api.functional.shoppingMall.seller.shipments.update(
      sellerConnection,
      {
        shipmentId: shipment.id,
        body: {
          trackingCarrier: newCarrier,
          trackingNumber: newTrackingNumber,
        } satisfies IShoppingMallShipment.IUpdate,
      },
    );
  typia.assert(updatedShipment);
  // 5. Find the tracking_updated log entry from the shipment logs
  const trackingUpdatedLog = updatedShipment.logs.find(
    (log) => log.eventType === "tracking_updated",
  );
  TestValidator.predicate(
    "tracking_updated log exists",
    trackingUpdatedLog !== undefined,
  );
  const logId = trackingUpdatedLog!.id;
  // 6. Retrieve the log entry by ID
  const retrievedLog =
    await api.functional.shoppingMall.seller.shipment_logs.at(
      sellerConnection,
      {
        logId: logId,
      },
    );
  typia.assert(retrievedLog);
  // 7. Validate the log entry contents
  TestValidator.equals(
    "event type",
    retrievedLog.eventType,
    "tracking_updated",
  );
  TestValidator.equals("actor type", retrievedLog.actorType, "seller");
  TestValidator.equals("actor ID", retrievedLog.actorId, sellerAuth.id);
  TestValidator.notEquals(
    "old status differs from new",
    retrievedLog.oldStatus,
    retrievedLog.newStatus,
  );
  TestValidator.predicate(
    "metadata contains new carrier",
    retrievedLog.metadata?.includes(newCarrier) ?? false,
  );
  TestValidator.predicate(
    "metadata contains new tracking number",
    retrievedLog.metadata?.includes(newTrackingNumber) ?? false,
  );
  TestValidator.predicate(
    "valid timestamp",
    new Date(retrievedLog.createdAt).getTime() > 0,
  );
  TestValidator.equals(
    "shipment ID matches",
    retrievedLog.shipment.id,
    shipment.id,
  );
}
