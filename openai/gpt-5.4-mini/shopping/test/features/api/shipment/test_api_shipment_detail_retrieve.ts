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

/**
 * Retrieve administrator shipment detail and verify shipment item grouping.
 *
 * Validates that an administrator can fetch a shipment detail record and that the
 * returned payload preserves the shipment header, seller context, order context,
 * tracking metadata, and shipment-item grouping used for fulfillment review.
 *
 * The test also checks the relationship consistency inside the shipment payload:
 * each shipment item must point back to the same shipment, each linked order item
 * must belong to the same order as the shipment, and each linked order item seller
 * must match the shipment seller summary.
 *
 * 1. Authenticate as an administrator using the provided join utility.
 * 2. Retrieve a shipment detail record by shipment ID.
 * 3. Validate the shipment payload structure and seller/order grouping consistency.
 */
export async function test_api_shipment_detail_retrieve(
  connection: api.IConnection,
): Promise<void> {
  const administratorConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(administratorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies IMallPlatformAdministrator.IJoin,
  });
  const shipment = await api.functional.mallPlatform.administrator.shipments.at(
    administratorConnection,
    {
      shipmentId: typia.random<string & tags.Format<"uuid">>(),
    },
  );
  typia.assert(shipment);
  TestValidator.predicate(
    "shipment items belong to the requested shipment",
    shipment.shipmentItems.every((item) => item.shipment.id === shipment.id),
  );
  TestValidator.predicate(
    "shipment items preserve the order context",
    shipment.shipmentItems.every(
      (item) => item.orderItem.order.id === shipment.order.id,
    ),
  );
  TestValidator.predicate(
    "shipment items preserve the seller grouping",
    shipment.shipmentItems.every(
      (item) => item.orderItem.seller.id === shipment.seller.id,
    ),
  );
}
