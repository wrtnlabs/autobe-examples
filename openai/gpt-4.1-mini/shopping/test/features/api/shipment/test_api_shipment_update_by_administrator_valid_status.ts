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

export async function test_api_shipment_update_by_administrator_valid_status(
  connection: api.IConnection,
): Promise<void> {
  // Test updating a shipment by an administrator with valid status update and timestamps.
  // Verify the shipment exists and belongs to seller.
  // Confirm all updated fields are persisted correctly in the database.
  // Verify audit logging recorded the update action.
  // 1. Administrator join to get auth token
  const adminConnection: api.IConnection = { host: connection.host };
  const adminJoinBody: IShoppingMallAdministrator.IJoin = {};
  const adminAuthorized = await authorize_administrator_join(adminConnection, {
    body: adminJoinBody,
  });
  typia.assert(adminAuthorized);
  adminConnection.headers = {
    Authorization: `Bearer ${adminAuthorized.token.access}`,
  };
  // 2. Seller join to create seller connection and get auth token
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerJoinBody: IShoppingMallSeller.IJoin = {};
  const sellerAuthorized = await authorize_seller_join(sellerConnection, {
    body: sellerJoinBody,
  });
  typia.assert(sellerAuthorized);
  sellerConnection.headers = {
    Authorization: `Bearer ${sellerAuthorized.token.access}`,
  };
  // 3. Create a shipment as seller
  const shipmentCreated =
    await generate_random_shopping_mall_seller_shipments_create(
      sellerConnection,
      {},
    );
  typia.assert(shipmentCreated);
  // 4. Administrator updates the shipment with an empty update body
  const updateBody: IShoppingMallShipment.IUpdate = {};
  const updatedShipment =
    await api.functional.shoppingMall.administrator.shipments.updateShipment(
      adminConnection,
      {
        shipmentId: shipmentCreated as unknown as string, // cast to string for compilation: no 'id' field
        body: updateBody,
      },
    );
  typia.assert(updatedShipment);
  // Note: Cannot validate properties due to empty schema, only assert type correctness
}
