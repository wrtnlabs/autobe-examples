import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_shipments_retrieve_with_tracking_missing(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const email = typia.random<string & tags.Format<"email">>();
  const password = typia.random<string & tags.Format<"password">>();
  await authorize_member_join(memberConnection, {
    body: {
      email,
      password,
    } satisfies IShoppingMallMember.IJoin,
  });
  const shipmentId = typia.random<string & tags.Format<"uuid">>();
  const shipment = await api.functional.shoppingMall.member.shipments.at(
    memberConnection,
    { shipmentId },
  );
  typia.assert(shipment);
  TestValidator.equals(
    "tracking is null when confirmation is missing",
    shipment.tracking,
    null,
  );
  TestValidator.predicate(
    "shipment has order id",
    shipment.order.id.length > 0,
  );
  TestValidator.predicate(
    "orderItems are scoped to the shipment's order",
    Array.isArray(shipment.orderItems) &&
      shipment.orderItems.every(
        (it) => it.shopping_mall_order_id === shipment.order.id,
      ),
  );
}
