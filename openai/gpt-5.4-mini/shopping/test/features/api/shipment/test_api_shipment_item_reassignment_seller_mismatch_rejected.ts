import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministrator";
import type { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import type { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import type { IMallPlatformOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrder";
import type { IMallPlatformOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrderItem";
import type { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import type { IMallPlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariant";
import type { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import type { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
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

export async function test_api_shipment_item_reassignment_seller_mismatch_rejected(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test shipment-item reassignment rejection for an invalid cross-shipment move.
   *
   * Validates that the administrator shipment-item reassignment endpoint rejects an update that attempts to move a shipment item to a different shipment context. Because the available test surface only exposes administrator authorization and the shipment-item update operation, this test focuses on the rejection behavior itself and does not invent unsupported setup or follow-up read APIs.
   *
   * 1. Authenticate as an administrator using a fresh connection.
   * 2. Prepare distinct shipment and shipment-item identifiers.
   * 3. Attempt an invalid reassignment and expect the operation to fail.
   */
  const administratorConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(administratorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies IMallPlatformAdministrator.IJoin,
  });
  const shipmentId = typia.random<string & tags.Format<"uuid">>();
  const shipmentItemId = typia.random<string & tags.Format<"uuid">>();
  const targetShipmentId = typia.random<string & tags.Format<"uuid">>();
  TestValidator.notEquals(
    "source and target shipments should be different",
    shipmentId,
    targetShipmentId,
  );
  await TestValidator.error(
    "shipment item reassignment should be rejected when the target shipment is incompatible",
    async () => {
      await api.functional.mallPlatform.administrator.shipments.items.putByShipmentidAndShipmentitemid(
        administratorConnection,
        {
          shipmentId,
          shipmentItemId,
          body: {
            shipmentId: targetShipmentId,
          } satisfies IMallPlatformShipmentItem.IUpdate,
        },
      );
    },
  );
}
