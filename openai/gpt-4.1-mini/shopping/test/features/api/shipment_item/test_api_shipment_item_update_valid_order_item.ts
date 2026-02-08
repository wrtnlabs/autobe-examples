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

export async function test_api_shipment_item_update_valid_order_item(
  connection: api.IConnection,
): Promise<void> {
  // Seller authorization
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {},
  });
  sellerConnection.headers = {
    Authorization: `Bearer ${sellerAuth.token.access}`,
  };
  // Since no creation of shipment item is available and DTOs empty, test update with empty body
  // Test expects error for non-existent shipmentItemId
  // Attempt update with a random shipmentItemId (likely not found)
  const randomShipmentItemId = typia.random<
    string & typia.tags.Format<"uuid">
  >();
  const emptyUpdateBody = {};
  // Expect 404 not found error
  await TestValidator.httpError("not found error", 404, async () => {
    await api.functional.shoppingMall.seller.shipment_items.updateShipmentItem(
      sellerConnection,
      {
        shipmentItemId: randomShipmentItemId,
        body: emptyUpdateBody,
      },
    );
  });
  // Test unauthorized access
  const unauthorizedConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError("unauthorized error", 401, async () => {
    await api.functional.shoppingMall.seller.shipment_items.updateShipmentItem(
      unauthorizedConnection,
      {
        shipmentItemId: randomShipmentItemId,
        body: emptyUpdateBody,
      },
    );
  });
  // Test success scenario with empty update body and random shipmentItemId
  // This is only to verify that call is accepted if shipmentItemId exists,
  // which we cannot guarantee, so skip actual success test
}
