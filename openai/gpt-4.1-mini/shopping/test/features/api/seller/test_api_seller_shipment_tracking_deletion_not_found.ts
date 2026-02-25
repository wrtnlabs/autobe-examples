import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_seller_shipment_tracking_deletion_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register new seller and authenticate
  const sellerJoinConnection: api.IConnection = { host: connection.host };
  const sellerAuthorized = await authorize_seller_join(sellerJoinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "StrongPass!123",
      shopName: RandomGenerator.name(2),
      shopDescription: null,
      logoUri: null,
    },
  });
  typia.assert(sellerAuthorized);
  // Prepare authorized connection with token
  const sellerConnection: api.IConnection = { host: connection.host };
  sellerConnection.headers = {
    Authorization: `Bearer ${sellerAuthorized.token.access}`,
  };
  // 2. Attempt to delete a shipment tracking with random non-existent UUID
  const nonExistentShipmentTrackingId = typia.random<
    string & tags.Format<"uuid">
  >();
  // We expect 404 error because the shipment tracking record does not exist
  await TestValidator.httpError(
    "delete non-existent shipment tracking",
    404,
    async () => {
      await api.functional.shoppingMall.seller.shipmentTrackings.erase(
        sellerConnection,
        {
          shipmentTrackingId: nonExistentShipmentTrackingId,
        },
      );
    },
  );
}
