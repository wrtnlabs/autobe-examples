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

export async function test_api_administrator_shipment_erase(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator join, returns authorization token
  const adminJoinConnection: api.IConnection = { host: connection.host };
  const administratorJoinBody: IShoppingMallAdministrator.IJoin =
    typia.random<IShoppingMallAdministrator.IJoin>();
  const administratorJoin = await authorize_administrator_join(
    adminJoinConnection,
    {
      body: administratorJoinBody,
    },
  );
  typia.assert(administratorJoin);
  // Use adminConnection for all admin calls with proper authorization headers
  const adminConnection: api.IConnection = { host: connection.host };
  adminConnection.headers ??= {};
  adminConnection.headers.Authorization = administratorJoin.token.access;
  // 2. Seller join, returns authorization token
  const sellerJoinConnection: api.IConnection = { host: connection.host };
  const sellerJoinBody: IShoppingMallSeller.IJoin =
    typia.random<IShoppingMallSeller.IJoin>();
  const sellerJoin = await authorize_seller_join(sellerJoinConnection, {
    body: sellerJoinBody,
  });
  typia.assert(sellerJoin);
  // Use sellerConnection for all seller calls with proper authorization headers
  const sellerConnection: api.IConnection = { host: connection.host };
  sellerConnection.headers ??= {};
  sellerConnection.headers.Authorization = sellerJoin.token.access;
  // 3. Create a shipment as seller prerequisite
  const shipment = await generate_random_shopping_mall_seller_shipments_create(
    sellerConnection,
    {},
  );
  typia.assert(shipment);
  // Inspect shipment and find proper identifier property
  // For example: commonly shipmentId or similar
  // Since shipment.id does not exist, let's assume shipment has 'shipment_id' or 'shipmentId'
  // We check for 'shipment_id' first, fallback to 'shipmentId', or throw explicit error
  const shipmentId = (shipment as any).shipment_id ?? (shipment as any).shipmentId;
  if (typeof shipmentId !== 'string') throw new Error('Shipment ID not found on shipment');
  // Scenario 1: Successful deletion by administrator
  await api.functional.shoppingMall.administrator.shipments.erase(
    adminConnection,
    {
      shipmentId: shipmentId,
    },
  );
  // No content expected, so test passes if no error thrown
  // Scenario 2: Deletion of non-existent shipment
  const nonExistentShipmentId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "deleting non-existent shipment results in 404",
    404,
    async () => {
      await api.functional.shoppingMall.administrator.shipments.erase(
        adminConnection,
        {
          shipmentId: nonExistentShipmentId,
        },
      );
    },
  );
  // Scenario 3: Unauthorized deletion attempt
  const unauthConnection: api.IConnection = { host: connection.host };
  // No authorization header set
  await TestValidator.httpError(
    "unauthorized deletion attempt results in 401 or 403",
    [401, 403],
    async () => {
      await api.functional.shoppingMall.administrator.shipments.erase(
        unauthConnection,
        {
          shipmentId: shipmentId,
        },
      );
    },
  );
}
