import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_shipment_admin_visibility_without_confirmation(
  connection: api.IConnection,
): Promise<void> {
  // Actor-specific connection for admin
  const adminConnection: api.IConnection = { host: connection.host };
  // 1) Admin authorization (join)
  const credentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
  } satisfies IShoppingMallAdmin.IJoin;
  await authorize_admin_join(adminConnection, {
    body: credentials,
  });
  // 2) Obtain shipment details for a target shipmentId.
  // There is no provided fixture/generator for creating shipments or confirmations in this prompt.
  const shipmentId = typia.random<string & tags.Format<"uuid">>();
  const shipment = await api.functional.shoppingMall.admin.admin.shipments.at(
    adminConnection,
    {
      shipmentId,
    },
  );
  typia.assert(shipment);
  // Validations
  TestValidator.equals("tracking is null", shipment.tracking, null);
  TestValidator.predicate(
    "orderItems array is not empty",
    shipment.orderItems.length >= 1,
  );
  for (const item of shipment.orderItems) {
    // line_item_status is expected to be present as a string in each returned item
    TestValidator.predicate(
      "line_item_status is returned",
      typeof item.line_item_status === "string" &&
        item.line_item_status.length > 0,
    );
  }
}
