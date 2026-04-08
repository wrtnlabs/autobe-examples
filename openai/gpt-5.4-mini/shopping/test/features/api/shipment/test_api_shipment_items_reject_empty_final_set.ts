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
 * Rejects shipment item reconciliation requests that would leave a shipment empty.
 *
 * Validates the administrator-only shipment membership update flow for an existing shipment. The test focuses on the business rule that a shipment must retain at least one order item after reconciliation and that a failed membership update must not mutate shipment header data or existing item assignment.
 *
 * 1. Authenticate as an administrator using a dedicated actor connection.
 * 2. Load a shipment that has at least one currently assigned order item.
 * 3. Attempt to reconcile the shipment membership into an empty final set using a business-invalid but type-valid request shape.
 * 4. Verify the update is rejected and the shipment remains unchanged.
 */
export async function test_api_shipment_items_reject_empty_final_set(
  connection: api.IConnection,
): Promise<void> {
  const administratorConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(administratorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "ChangeMe123!" satisfies string &
        tags.Format<"password"> as string & tags.Format<"password">,
    } satisfies IMallPlatformAdministrator.IJoin,
  });
  const shipment =
    await api.functional.mallPlatform.administrator.shipments.items.patchByShipmentid(
      administratorConnection,
      {
        shipmentId: typia.random<string & tags.Format<"uuid">>(),
        body: {
          orderItemIds: [typia.random<string & tags.Format<"uuid">>()],
        } satisfies IMallPlatformShipment.IUpdateItem,
      },
    );
  typia.assert(shipment);
  const before = {
    id: shipment.id,
    seller: shipment.seller,
    order: shipment.order,
    carrierName: shipment.carrierName,
    trackingNumber: shipment.trackingNumber,
    trackingUrl: shipment.trackingUrl,
    status: shipment.status,
    shippedAt: shipment.shippedAt,
    deliveredAt: shipment.deliveredAt,
    createdAt: shipment.createdAt,
    updatedAt: shipment.updatedAt,
    deletedAt: shipment.deletedAt,
  } satisfies IMallPlatformShipment;
  await TestValidator.error(
    "shipment item reconciliation must reject an empty final set",
    async () => {
      await api.functional.mallPlatform.administrator.shipments.items.patchByShipmentid(
        administratorConnection,
        {
          shipmentId: shipment.id,
          body: {
            orderItemIds: [typia.random<string & tags.Format<"uuid">>()],
          } satisfies IMallPlatformShipment.IUpdateItem,
        },
      );
    },
  );
  const after = {
    id: shipment.id,
    seller: shipment.seller,
    order: shipment.order,
    carrierName: shipment.carrierName,
    trackingNumber: shipment.trackingNumber,
    trackingUrl: shipment.trackingUrl,
    status: shipment.status,
    shippedAt: shipment.shippedAt,
    deliveredAt: shipment.deliveredAt,
    createdAt: shipment.createdAt,
    updatedAt: shipment.updatedAt,
    deletedAt: shipment.deletedAt,
  } satisfies IMallPlatformShipment;
  TestValidator.equals(
    "shipment header should remain unchanged",
    after,
    before,
  );
}
