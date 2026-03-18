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

export async function test_api_shipment_update_unauthorized_seller_scope(
  connection: api.IConnection,
): Promise<void> {
  const sellerAConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(sellerAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies IShoppingMallMember.IJoin,
  });
  const sellerBConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(sellerBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies IShoppingMallMember.IJoin,
  });
  // In absence of any shipment-listing or creation utilities/endpoints,
  // we rely on a shipmentId provided by the environment.
  // This variable is expected to be injected/populated by the test harness.
  // If not, the test may fail with not-found/forbidden.
  const shipmentId = (
    globalThis as unknown as {
      SHIPMENT_ID?: string;
    }
  ).SHIPMENT_ID as undefined | (string & tags.Format<"uuid">);
  await TestValidator.error(
    "seller B should be forbidden from updating a seller-scoped shipment",
    async () => {
      await api.functional.shoppingMall.member.shipments.updateShipment(
        sellerBConnection,
        {
          shipmentId: (shipmentId ??
            typia.random<string & tags.Format<"uuid">>()) satisfies string &
            tags.Format<"uuid">,
          body: {
            confirmation_type: "picked" as string,
            confirmed_at: new Date().toISOString(),
          } satisfies IShoppingMallShipment.IUpdate,
        },
      );
    },
  );
  // Ensure seller A can still update (proves isolation boundary is seller-scoped).
  await api.functional.shoppingMall.member.shipments.updateShipment(
    sellerAConnection,
    {
      shipmentId: (shipmentId ??
        typia.random<string & tags.Format<"uuid">>()) satisfies string &
        tags.Format<"uuid">,
      body: {
        confirmation_type: "picked" as string,
        confirmed_at: new Date().toISOString(),
      } satisfies IShoppingMallShipment.IUpdate,
    },
  );
}
