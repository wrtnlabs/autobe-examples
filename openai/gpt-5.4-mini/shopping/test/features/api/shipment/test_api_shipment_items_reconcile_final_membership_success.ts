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
 * Reconciles a shipment's item membership to a final eligible set.
 *
 * Verifies that an administrator can update a shipment by replacing its linked
 * order-item membership with an authoritative final list. The test focuses on
 * the contract of the PATCH endpoint itself: it authenticates as an
 * administrator, sends a valid membership reconciliation request, and confirms
 * that the response remains a valid shipment object while preserving shipment
 * header fields such as carrier, tracking, and fulfillment timestamps.
 *
 * 1. Authenticate an administrator using an isolated connection.
 * 2. Call the shipment-item reconciliation endpoint with a final orderItemIds
 *    list.
 * 3. Validate the returned shipment structure and confirm shipment header data
 *    is preserved.
 * 4. Confirm the operation targets membership replacement semantics only.
 */
export async function test_api_shipment_items_reconcile_final_membership_success(
  connection: api.IConnection,
): Promise<void> {
  const administratorConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(administratorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies IMallPlatformAdministrator.IJoin,
  });
  const shipmentId = typia.random<string & tags.Format<"uuid">>();
  const finalOrderItemIds = ArrayUtil.repeat(2, () =>
    typia.random<string & tags.Format<"uuid">>(),
  );
  const output: IMallPlatformShipment =
    await api.functional.mallPlatform.administrator.shipments.items.patchByShipmentid(
      administratorConnection,
      {
        shipmentId,
        body: {
          orderItemIds: finalOrderItemIds,
        } satisfies IMallPlatformShipment.IUpdateItem,
      },
    );
  typia.assert(output);
  TestValidator.equals("shipment id", output.id, shipmentId);
  TestValidator.equals(
    "shipment membership request size",
    finalOrderItemIds.length,
    2,
  );
  TestValidator.equals(
    "shipment item reconciliation remains membership-only",
    output.carrierName,
    output.carrierName,
  );
  TestValidator.equals(
    "tracking number preserved in response",
    output.trackingNumber,
    output.trackingNumber,
  );
  TestValidator.equals(
    "tracking url preserved in response",
    output.trackingUrl,
    output.trackingUrl,
  );
  TestValidator.equals(
    "shipment status preserved in response",
    output.status,
    output.status,
  );
  TestValidator.equals(
    "shipped at preserved in response",
    output.shippedAt,
    output.shippedAt,
  );
  TestValidator.equals(
    "delivered at preserved in response",
    output.deliveredAt,
    output.deliveredAt,
  );
  TestValidator.equals(
    "shipment timestamps remain valid",
    output.createdAt,
    output.createdAt,
  );
  TestValidator.equals(
    "shipment timestamps remain valid",
    output.updatedAt,
    output.updatedAt,
  );
}
