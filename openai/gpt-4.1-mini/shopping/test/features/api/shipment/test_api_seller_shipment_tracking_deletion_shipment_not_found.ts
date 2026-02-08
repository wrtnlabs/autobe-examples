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

export async function test_api_seller_shipment_tracking_deletion_shipment_not_found(
  connection: api.IConnection,
): Promise<void> {
  // Seller authentication
  const sellerConnection: api.IConnection = { host: connection.host };
  const authorizedSeller = await authorize_seller_join(sellerConnection, {
    body: typia.random<IShoppingMallSeller.IJoin>(),
  });
  typia.assert(authorizedSeller);
  sellerConnection.headers = { Authorization: authorizedSeller.token.access };
  // Prepare non-existent shipmentId and random trackingId
  const nonExistentShipmentId = typia.random<string & tags.Format<"uuid">>();
  const trackingId = typia.random<string & tags.Format<"uuid">>();
  // Attempt to delete tracking record from non-existent shipment
  await TestValidator.httpError(
    "shipment tracking deletion with non-existent shipment",
    404,
    async () => {
      await api.functional.shoppingMall.seller.shipments.trackings.eraseTracking(
        sellerConnection,
        {
          shipmentId: nonExistentShipmentId,
          trackingId: trackingId,
        },
      );
    },
  );
}
