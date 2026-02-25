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

export async function test_api_seller_erase_shipment_order_item_unauthorized(
  connection: api.IConnection,
): Promise<void> {
  // This test does NOT authenticate the seller, so the deletion attempt should fail with authorization error
  const shipmentOrderItemId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "unauthorized erase shipment order item",
    [401, 403],
    async () => {
      // Directly call the eraseShipmentOrderItem utility without any authorization
      await api.functional.shoppingMall.seller.shipmentOrderItems.eraseShipmentOrderItem(
        connection,
        {
          shipmentOrderItemId,
        },
      );
    },
  );
}
