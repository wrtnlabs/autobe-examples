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

export async function test_api_seller_shipment_item_deletion_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate seller by join
  const sellerConnection: api.IConnection = { host: connection.host };
  const authorizedSeller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "strongpassword123",
      shopName: "Test Seller Shop",
      shopDescription: null,
      logoUri: null,
    },
  });
  // Set the authorized token in connection headers
  sellerConnection.headers = {
    Authorization: `Bearer ${authorizedSeller.token.access}`,
  };
  // 2. Attempt to delete a non-existent shipment item with random UUID
  const nonExistentShipmentItemId = typia.random<
    string & tags.Format<"uuid">
  >();
  // 3. Expect 404 Not Found error
  await TestValidator.httpError(
    "delete non-existent shipment item returns 404",
    404,
    async () => {
      await api.functional.shoppingMall.seller.shipment_items.erase(
        sellerConnection,
        {
          shipmentItemId: nonExistentShipmentItemId,
        },
      );
    },
  );
}
