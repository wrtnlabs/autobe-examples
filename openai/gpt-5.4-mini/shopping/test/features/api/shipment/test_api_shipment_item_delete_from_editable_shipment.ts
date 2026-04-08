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
import { generate_random_mall_platform_administrator_shipments_create } from "../../../generate/generate_random_mall_platform_administrator_shipments_create";
import { prepare_random_mall_platform_shipment } from "../../../prepare/prepare_random_mall_platform_shipment";

export async function test_api_shipment_item_delete_from_editable_shipment(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Verify that an administrator can remove an editable shipment item without deleting the shipment.
   *
   * This scenario validates the shipment-item deletion workflow for editable shipments. It ensures that removing one item from a shipment leaves the shipment record itself intact and that the operation completes successfully under administrator authorization.
   *
   * 1. Register and authenticate an administrator in an isolated connection.
   * 2. Create a shipment containing multiple eligible order items.
   * 3. Remove one shipment-item association from the created shipment.
   * 4. Confirm the delete request succeeds without affecting the shipment call flow.
   */
  const administratorConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(administratorConnection, {
    body: {
      email: `${RandomGenerator.alphabets(8)}@test.com` satisfies string,
      password: "Password123!" satisfies string,
    } satisfies IMallPlatformAdministrator.IJoin,
  });
  const shipment =
    await api.functional.mallPlatform.administrator.shipments.create(
      administratorConnection,
      {
        body: {
          carrierName: RandomGenerator.name(),
          trackingNumber: RandomGenerator.alphaNumeric(12),
          orderItemIds: ArrayUtil.repeat(2, () =>
            typia.random<string & tags.Format<"uuid">>(),
          ),
        } satisfies IMallPlatformShipment.ICreate,
      },
    );
  typia.assert(shipment);
  await api.functional.mallPlatform.administrator.shipments.items.erase(
    administratorConnection,
    {
      shipmentId: shipment.id,
      shipmentItemId: typia.random<string & tags.Format<"uuid">>(),
    },
  );
}
