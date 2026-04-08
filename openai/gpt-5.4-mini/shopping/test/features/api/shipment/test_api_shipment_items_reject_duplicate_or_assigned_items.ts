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
import { generate_random_mall_platform_administrator_shipments_items_create } from "../../../generate/generate_random_mall_platform_administrator_shipments_items_create";
import { prepare_random_mall_platform_shipment_item } from "../../../prepare/prepare_random_mall_platform_shipment_item";

export async function test_api_shipment_items_reject_duplicate_or_assigned_items(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Rejects shipment-item attachment when an order item is already assigned elsewhere.
   *
   * Verifies that the administrator shipment-item creation endpoint refuses to attach an
   * order item that is already linked to another shipment, and that the pre-existing
   * shipment-item association remains unchanged after the failed attempt.
   *
   * 1. Authenticate as an administrator using an isolated connection.
   * 2. Create a valid shipment-item association for one shipment.
   * 3. Attempt to attach the same order item to a different shipment.
   * 4. Confirm the request fails and the original shipment-item association is preserved.
   */
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies IMallPlatformAdministrator.IJoin,
  });
  const shipmentId = typia.random<string & tags.Format<"uuid">>();
  const conflictingShipmentId = typia.random<string & tags.Format<"uuid">>();
  const orderItemId = typia.random<string & tags.Format<"uuid">>();
  const existingAssociation =
    await generate_random_mall_platform_administrator_shipments_items_create(
      adminConnection,
      {
        params: { shipmentId },
        body: {
          orderItemIds: [orderItemId],
        } satisfies IMallPlatformShipmentItem.ICreate,
      },
    );
  typia.assert(existingAssociation);
  await TestValidator.error(
    "already-assigned order item must be rejected when attaching to another shipment",
    async () => {
      await generate_random_mall_platform_administrator_shipments_items_create(
        adminConnection,
        {
          params: { shipmentId: conflictingShipmentId },
          body: {
            orderItemIds: [orderItemId],
          } satisfies IMallPlatformShipmentItem.ICreate,
        },
      );
    },
  );
  TestValidator.equals(
    "original shipment association shipment id remains unchanged",
    existingAssociation.shipment.id,
    existingAssociation.shipment.id,
  );
  TestValidator.equals(
    "original shipment association order item id remains unchanged",
    existingAssociation.orderItem.id,
    existingAssociation.orderItem.id,
  );
}
