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

export async function test_api_seller_shipment_partial_update(
  connection: api.IConnection,
): Promise<void> {
  // Create actor-specific connection for seller operations
  const sellerConnection: api.IConnection = { host: connection.host };
  // Register and login as seller
  const sellerAuthorized = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      name: RandomGenerator.name(),
      shopName: RandomGenerator.name(3),
      shopDescription: RandomGenerator.paragraph({ sentences: 2 }),
    } satisfies IShoppingMallSeller.IJoin,
  });
  // Create authenticated connection for subsequent API calls
  const authenticatedSellerConnection: api.IConnection = {
    host: connection.host,
  };
  authenticatedSellerConnection.headers = {
    Authorization: `Bearer ${sellerAuthorized.token.access}`,
  };
  // Test partial update with shipment data
  // Using a valid UUID format for shipment ID
  const shipmentId = "123e4567-e89b-12d3-a456-426614174000";
  const updateBody = {
    tracking_number: "TK123456789",
  } satisfies IShoppingMallShipment.IUpdate;
  const updatedShipment =
    await api.functional.shoppingMall.seller.shipments.patchByShipmentid(
      authenticatedSellerConnection,
      {
        shipmentId: shipmentId,
        body: updateBody,
      },
    );
  typia.assert(updatedShipment);
}
