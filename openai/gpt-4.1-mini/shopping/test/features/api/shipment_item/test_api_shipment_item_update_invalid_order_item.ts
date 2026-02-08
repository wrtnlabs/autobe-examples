import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipmentItem";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_shipment_item_update_invalid_order_item(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller registration and authorization
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: typia.random<IShoppingMallSeller.IJoin>(),
  });
  typia.assert(sellerAuth);
  sellerConnection.headers = { Authorization: sellerAuth.token.access };
  // 2. Prepare invalid shipmentItemId and invalid body for update
  const invalidShipmentItemId = typia.random<string & tags.Format<"uuid">>();
  // Attempt to update shipment item with invalid order_item_id
  const invalidUpdateBody = {} as IShoppingMallShipmentItem.IUpdate;
  // Deliberately setting an invalid order item ID (UUID), which does not exist in DB
  // Actually the IUpdate type is empty according to provided DTO, so test updating
  // with invalid shipmentItemId should error out
  // 3. Call updateShipmentItem with invalid shipmentItemId and invalid body
  await TestValidator.error(
    "update shipment item with invalid/nonexistent order item ID",
    async () => {
      await api.functional.shoppingMall.seller.shipment_items.updateShipmentItem(
        sellerConnection,
        {
          shipmentItemId: invalidShipmentItemId,
          body: invalidUpdateBody,
        },
      );
    },
  );
}
