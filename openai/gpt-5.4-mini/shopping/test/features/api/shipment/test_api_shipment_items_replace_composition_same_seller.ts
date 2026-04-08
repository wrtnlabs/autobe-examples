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
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMallPlatformShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformShipmentItem";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_shipment_items_replace_composition_same_seller(
  connection: api.IConnection,
): Promise<void> {
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123!" satisfies string & tags.Format<"password">,
    } satisfies IMallPlatformAdministrator.IJoin,
  });
  const shipmentId = typia.random<string & tags.Format<"uuid">>();
  const firstOrderItemId = typia.random<string & tags.Format<"uuid">>();
  const secondOrderItemId = typia.random<string & tags.Format<"uuid">>();
  const replacementOrderItemId = typia.random<string & tags.Format<"uuid">>();
  const initial =
    await api.functional.mallPlatform.administrator.shipments.shipmentItems.index(
      adminConnection,
      {
        shipmentId,
        body: {
          orderItemIds: [firstOrderItemId, secondOrderItemId],
        } satisfies IMallPlatformShipmentItem.IUpdate,
      },
    );
  typia.assert(initial);
  const updated =
    await api.functional.mallPlatform.administrator.shipments.shipmentItems.index(
      adminConnection,
      {
        shipmentId,
        body: {
          orderItemIds: [secondOrderItemId, replacementOrderItemId],
        } satisfies IMallPlatformShipmentItem.IUpdate,
      },
    );
  typia.assert(updated);
  TestValidator.equals(
    "shipment items should be replaced, not appended",
    updated.data.length,
    2,
  );
  TestValidator.notEquals(
    "shipment composition should change after replacement",
    initial.data.map((item) => item.orderItem.id).join(","),
    updated.data.map((item) => item.orderItem.id).join(","),
  );
  TestValidator.predicate(
    "updated shipment items should all belong to the same shipment",
    () =>
      updated.data.every(
        (item) => item.shipment.id === updated.data[0]?.shipment.id,
      ),
  );
  TestValidator.predicate(
    "updated shipment should remain a single-seller package",
    () =>
      updated.data.every(
        (item) =>
          item.orderItem.seller.id === updated.data[0]?.orderItem.seller.id,
      ),
  );
}
