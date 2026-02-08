import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_seller_shipments_create } from "../../../generate/generate_random_shopping_mall_seller_shipments_create";
import { prepare_random_shopping_mall_shipment } from "../../../prepare/prepare_random_shopping_mall_shipment";

export async function test_api_seller_shipments_delete_with_authorization_error(
  connection: api.IConnection,
): Promise<void> {
  // Scenario 1: Successful Deletion of an Existing Shipment by an Authorized Seller
  // Seller A joins and authenticates
  const sellerAConnection: api.IConnection = { host: connection.host };
  const sellerAAuth = await authorize_seller_join(sellerAConnection, {
    body: {},
  });
  sellerAConnection.headers = {
    Authorization: `Bearer ${sellerAAuth.token.access}`,
  };
  // Seller A creates a shipment
  const shipment = await generate_random_shopping_mall_seller_shipments_create(
    sellerAConnection,
    { body: {} },
  );
  typia.assert(shipment);
  // Seller A deletes the shipment
  await api.functional.shoppingMall.seller.shipments.erase(sellerAConnection, {
    shipmentId: (shipment as IEntity).id,
  });
  // Scenario 2: Attempted Deletion of Non-Existent Shipment
  // Seller A tries to delete the same shipment again (should fail 404)
  await TestValidator.httpError(
    "delete non-existent shipment 404",
    404,
    async () => {
      await api.functional.shoppingMall.seller.shipments.erase(
        sellerAConnection,
        {
          shipmentId: (shipment as IEntity).id,
        },
      );
    },
  );
  // Scenario 3: Unauthorized Deletion Attempt by Another Seller
  // Seller B joins and authenticates
  const sellerBConnection: api.IConnection = { host: connection.host };
  const sellerBAuth = await authorize_seller_join(sellerBConnection, {
    body: {},
  });
  sellerBConnection.headers = {
    Authorization: `Bearer ${sellerBAuth.token.access}`,
  };
  // Seller B attempts to delete Seller A's previously deleted shipment
  // Since shipment is deleted already, re-create a shipment for proper validation
  const shipmentA2 =
    await generate_random_shopping_mall_seller_shipments_create(
      sellerAConnection,
      { body: {} },
    );
  typia.assert(shipmentA2);
  // Seller B tries to delete shipmentA2 (should fail authorization 403 or similar)
  await TestValidator.httpError(
    "unauthorized shipment deletion by another seller",
    [403],
    async () => {
      await api.functional.shoppingMall.seller.shipments.erase(
        sellerBConnection,
        {
          shipmentId: (shipmentA2 as IEntity).id,
        },
      );
    },
  );
  // Confirm shipment still exists by attempting deletion with owner again
  await api.functional.shoppingMall.seller.shipments.erase(sellerAConnection, {
    shipmentId: (shipmentA2 as IEntity).id,
  });
}
