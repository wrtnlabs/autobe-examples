import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_seller_shipments_create } from "../../../generate/generate_random_shopping_mall_seller_shipments_create";
import { prepare_random_shopping_mall_shipment } from "../../../prepare/prepare_random_shopping_mall_shipment";

export async function test_api_shipment_update_unauthorized_access_denied(
  connection: api.IConnection,
): Promise<void> {
  // Scenario: Attempt to update a shipment as a seller (non-administrator) and expect authorization failure
  // Steps:
  // 1. Seller joins and logs in
  // 2. Seller creates a shipment
  // 3. Seller attempts to update the shipment via administrator endpoint
  // 4. Expect authorization failure and validate error response
  // Seller join
  const joinBody = typia.random<IShoppingMallSeller.IJoin>();
  const sellerJoinConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerJoinConnection, {
    body: joinBody,
  });
  typia.assert(sellerAuth);
  // Seller login
  const loginBody: IShoppingMallSeller.ILogin = {
    ...joinBody,
  };
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerLoginAuth = await authorize_seller_login(sellerConnection, {
    body: loginBody,
  });
  typia.assert(sellerLoginAuth);
  sellerConnection.headers = sellerConnection.headers ?? {};
  sellerConnection.headers.Authorization = sellerLoginAuth.token.access;
  // Seller creates a shipment
  const shipment = await generate_random_shopping_mall_seller_shipments_create(
    sellerConnection,
    { body: undefined },
  );
  typia.assert(shipment);
  // Attempt to update shipment with seller connection using administrator endpoint
  await TestValidator.httpError(
    "unauthorized shipment update is denied",
    403,
    async () => {
      await api.functional.shoppingMall.administrator.shipments.updateShipment(
        sellerConnection,
        {
          shipmentId: shipment as unknown as string,
          body: typia.random<IShoppingMallShipment.IUpdate>(),
        },
      );
    },
  );
}
