import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministrator";
import type { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import type { IMallPlatformOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrder";
import type { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import type { IMallPlatformShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformShipment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

/**
 * Test administrator shipment tracking updates and lifecycle timestamps.
 *
 * Validates that an administrator can update editable shipment header fields,
 * while preserving shipment ownership and order linkage. Also verifies that
 * shipment lifecycle timestamps are populated appropriately when the status
 * advances to shipped or delivered.
 *
 * 1. Authenticate as an administrator using the provided authorization utility.
 * 2. Update shipment tracking information through the administrator endpoint.
 * 3. Confirm that the shipment identity and relational links remain preserved.
 * 4. Confirm that shipped and delivered timestamps are populated on the correct transitions.
 */
export async function test_api_shipment_update_tracking_and_status(
  connection: api.IConnection,
): Promise<void> {
  const adminConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: `${RandomGenerator.alphaNumeric(10)}Aa1!`,
    } satisfies IMallPlatformAdministrator.IJoin,
  });
  const authenticatedAdminConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: `Bearer ${authorized.token.access}` },
  };
  const shipmentId = typia.random<string & tags.Format<"uuid">>();
  const carrierName = RandomGenerator.name();
  const trackingNumber = RandomGenerator.alphaNumeric(16);
  const trackingUrl = `https://tracking.example.com/${RandomGenerator.alphaNumeric(10)}`;
  const updatedShipment =
    await api.functional.mallPlatform.administrator.shipments.update(
      authenticatedAdminConnection,
      {
        shipmentId,
        body: {
          carrierName,
          trackingNumber,
          trackingUrl,
          status: "shipped",
        } satisfies IMallPlatformShipment.IUpdate,
      },
    );
  typia.assert(updatedShipment);
  TestValidator.equals(
    "shipment id should be preserved",
    updatedShipment.id,
    shipmentId,
  );
  TestValidator.equals(
    "carrier name should be updated",
    updatedShipment.carrierName,
    carrierName,
  );
  TestValidator.equals(
    "tracking number should be updated",
    updatedShipment.trackingNumber,
    trackingNumber,
  );
  TestValidator.equals(
    "tracking url should be updated",
    updatedShipment.trackingUrl,
    trackingUrl,
  );
  TestValidator.equals(
    "shipment status should be shipped",
    updatedShipment.status,
    "shipped",
  );
  TestValidator.predicate(
    "shipped at should be populated when shipment becomes shipped",
    updatedShipment.shippedAt !== null,
  );
  TestValidator.equals(
    "delivered at should remain null when shipment is only shipped",
    updatedShipment.deliveredAt,
    null,
  );
  TestValidator.predicate(
    "seller linkage should be preserved",
    updatedShipment.seller.id.length > 0,
  );
  TestValidator.predicate(
    "order linkage should be preserved",
    updatedShipment.order.id.length > 0,
  );
  TestValidator.equals(
    "shipment should remain active",
    updatedShipment.deletedAt,
    null,
  );
  const deliveredShipment =
    await api.functional.mallPlatform.administrator.shipments.update(
      authenticatedAdminConnection,
      {
        shipmentId,
        body: {
          status: "delivered",
        } satisfies IMallPlatformShipment.IUpdate,
      },
    );
  typia.assert(deliveredShipment);
  TestValidator.equals(
    "shipment id should remain the same after delivery transition",
    deliveredShipment.id,
    updatedShipment.id,
  );
  TestValidator.equals(
    "seller linkage should remain the same after delivery transition",
    deliveredShipment.seller.id,
    updatedShipment.seller.id,
  );
  TestValidator.equals(
    "order linkage should remain the same after delivery transition",
    deliveredShipment.order.id,
    updatedShipment.order.id,
  );
  TestValidator.equals(
    "carrier name should remain unchanged when only status changes",
    deliveredShipment.carrierName,
    updatedShipment.carrierName,
  );
  TestValidator.equals(
    "tracking number should remain unchanged when only status changes",
    deliveredShipment.trackingNumber,
    updatedShipment.trackingNumber,
  );
  TestValidator.equals(
    "tracking url should remain unchanged when only status changes",
    deliveredShipment.trackingUrl,
    updatedShipment.trackingUrl,
  );
  TestValidator.equals(
    "shipment status should be delivered",
    deliveredShipment.status,
    "delivered",
  );
  TestValidator.predicate(
    "shipped at should stay populated after delivery transition",
    deliveredShipment.shippedAt !== null,
  );
  TestValidator.predicate(
    "delivered at should be populated after delivery transition",
    deliveredShipment.deliveredAt !== null,
  );
  TestValidator.equals(
    "shipment should remain active after delivery transition",
    deliveredShipment.deletedAt,
    null,
  );
}
