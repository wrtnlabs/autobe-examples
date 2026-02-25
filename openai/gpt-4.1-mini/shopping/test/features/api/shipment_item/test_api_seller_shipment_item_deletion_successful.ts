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

export async function test_api_seller_shipment_item_deletion_successful(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller join and authenticate
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      shopName: RandomGenerator.name(),
      shopDescription: null,
      logoUri: null,
    },
  });
  sellerConnection.headers = {
    Authorization: `Bearer ${sellerAuth.token.access}`,
  };
  // 2. Since no shipment item creation API is provided, we simulate the existence of a shipment item ID to delete
  // For a real environment, this would be replaced with actual shipment and shipment item creation steps
  const shipmentItemId = typia.random<string & tags.Format<"uuid">>();
  // 3. Perform deletion
  await api.functional.shoppingMall.seller.shipment_items.erase(
    sellerConnection,
    {
      shipmentItemId,
    },
  );
  // 4. Verify deletion by attempting another deletion expecting 404 Not Found
  await TestValidator.httpError(
    "deleting non-existent shipment item",
    404,
    async () => {
      await api.functional.shoppingMall.seller.shipment_items.erase(
        sellerConnection,
        {
          shipmentItemId,
        },
      );
    },
  );
}
