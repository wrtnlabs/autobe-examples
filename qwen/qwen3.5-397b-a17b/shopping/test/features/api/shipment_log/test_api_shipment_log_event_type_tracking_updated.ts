import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
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

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_seller_shipments_create } from "../../../generate/generate_random_shopping_mall_seller_shipments_create";
import { prepare_random_shopping_mall_shipment } from "../../../prepare/prepare_random_shopping_mall_shipment";

/**
 * Test that administrator can retrieve shipment logs for tracking_updated events.
 *
 * This test validates the shipment audit trail functionality by:
 * 1. Creating administrator and seller accounts
 * 2. Seller creates a shipment (which generates initial 'created' log)
 * 3. Seller updates shipment tracking information (generates 'tracking_updated' log)
 * 4. Administrator retrieves the tracking_updated log entry
 * 5. Verifies the log contains correct eventType, actorType, actorId, and metadata
 * 6. Confirms the immutable audit trail captures the tracking state change
 *
 * This ensures compliance and dispute resolution capabilities through proper
 * shipment lifecycle event logging.
 */
export async function test_api_shipment_log_event_type_tracking_updated(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator setup
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {});
  // 2. Seller setup
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {});
  // 3. Seller creates shipment (generates 'created' log entry)
  const shipment = await generate_random_shopping_mall_seller_shipments_create(
    sellerConnection,
    {},
  );
  typia.assert(shipment);
  // Verify initial shipment has logs
  TestValidator.predicate(
    "shipment has initial logs",
    shipment.logs.length > 0,
  );
  // Store initial log count
  const initialLogCount = shipment.logs.length;
  // 4. Seller updates shipment tracking information (generates 'tracking_updated' log)
  const updatedTrackingCarrier = "DHL Express";
  const updatedTrackingNumber = `TRK${RandomGenerator.alphaNumeric(12)}`;
  const updatedShipment =
    await api.functional.shoppingMall.seller.shipments.update(
      sellerConnection,
      {
        shipmentId: shipment.id,
        body: {
          trackingCarrier: updatedTrackingCarrier,
          trackingNumber: updatedTrackingNumber,
        } satisfies IShoppingMallShipment.IUpdate,
      },
    );
  typia.assert(updatedShipment);
  // 5. Verify tracking information was updated
  TestValidator.equals(
    "carrier updated",
    updatedShipment.tracking_carrier,
    updatedTrackingCarrier,
  );
  TestValidator.equals(
    "tracking number updated",
    updatedShipment.tracking_number,
    updatedTrackingNumber,
  );
  // 6. Verify new log entry was created for tracking update
  TestValidator.predicate(
    "new log created",
    updatedShipment.logs.length > initialLogCount,
  );
  // Find the tracking_updated log entry
  const trackingUpdatedLog = updatedShipment.logs.find(
    (log) => log.eventType === "tracking_updated",
  );
  TestValidator.predicate(
    "tracking_updated log exists",
    trackingUpdatedLog !== undefined,
  );
  // Use typia.assertGuard to narrow the type for TypeScript
  typia.assertGuard(trackingUpdatedLog!);
  // 7. Administrator retrieves the tracking_updated log entry
  const adminLog =
    await api.functional.shoppingMall.administrator.shipment_logs.at(
      adminConnection,
      {
        logId: trackingUpdatedLog.id,
      },
    );
  typia.assert(adminLog);
  // 8. Validate log properties
  TestValidator.equals(
    "event type is tracking_updated",
    adminLog.eventType,
    "tracking_updated",
  );
  TestValidator.equals("actor type is seller", adminLog.actorType, "seller");
  TestValidator.equals("actor ID matches seller", adminLog.actorId, seller.id);
  TestValidator.predicate("old status recorded", adminLog.oldStatus !== null);
  TestValidator.predicate("new status recorded", adminLog.newStatus !== null);
  TestValidator.predicate(
    "metadata contains tracking info",
    adminLog.metadata !== null,
  );
  // 9. Verify metadata contains updated tracking information
  TestValidator.predicate(
    "metadata includes carrier",
    adminLog.metadata!.includes(updatedTrackingCarrier),
  );
  TestValidator.predicate(
    "metadata includes tracking number",
    adminLog.metadata!.includes(updatedTrackingNumber),
  );
  // 10. Verify shipment reference in log
  TestValidator.equals(
    "log shipment ID matches",
    adminLog.shipment.id,
    updatedShipment.id,
  );
}
