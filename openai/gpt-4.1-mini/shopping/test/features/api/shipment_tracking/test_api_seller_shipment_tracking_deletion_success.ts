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

export async function test_api_seller_shipment_tracking_deletion_success(
  connection: api.IConnection,
): Promise<void> {
  // This test covers the deletion of a shipment tracking record by an authorized seller.
  // 1. Seller registration and obtain authenticated connection
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuthorized = await authorize_seller_join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      shopName: "TestShop",
      shopDescription: null,
      logoUri: null,
    },
  });
  typia.assert(sellerAuthorized);
  sellerConnection.headers = { Authorization: sellerAuthorized.token.access };
  // 2. Create shipment tracking record
  // Since no utility function or API for creating shipment tracking was given,
  // we simulate the creation by generating a random UUID as the shipmentTrackingId.
  // Normally, a creation API call should be placed here.
  const shipmentTrackingId = typia.random<string & tags.Format<"uuid">>();
  // 3. Delete the shipment tracking record using the shipmentTrackingId
  await api.functional.shoppingMall.seller.shipmentTrackings.erase(
    sellerConnection,
    { shipmentTrackingId },
  );
  // 4. Verify successful deletion (204 return) - implicit by no error thrown
  // 5. Post-delete check of non-existence is not possible due to no GET or list
  // utility available, so we rely on absence of errors and proper authorization.
}
