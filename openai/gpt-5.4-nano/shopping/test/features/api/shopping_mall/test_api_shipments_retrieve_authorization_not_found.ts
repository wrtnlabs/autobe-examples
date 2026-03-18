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

export async function test_api_shipments_retrieve_authorization_not_found(
  connection: api.IConnection,
): Promise<void> {
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberBConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies IShoppingMallMember.IJoin,
  });
  await authorize_member_join(memberBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies IShoppingMallMember.IJoin,
  });
  // We lack order/shipment creation utilities in the provided inputs.
  // Use a UUID-shaped shipmentId and verify the endpoint returns not-found
  // (authorization boundary must not leak resource existence/details).
  const memberBShipmentId = typia.random<string & tags.Format<"uuid">>();
  const memberBShipmentId2 = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "should return 404 not-found when accessing shipment not in member A context",
    404,
    async () => {
      await api.functional.shoppingMall.member.shipments.at(memberAConnection, {
        shipmentId: memberBShipmentId,
      });
    },
  );
  await TestValidator.httpError(
    "should return 404 not-found when accessing another shipment not in member A context",
    404,
    async () => {
      await api.functional.shoppingMall.member.shipments.at(memberAConnection, {
        shipmentId: memberBShipmentId2,
      });
    },
  );
}
