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

export async function test_api_shipment_item_update_unauthorized(
  connection: api.IConnection,
): Promise<void> {
  // Use a random UUID for shipmentItemId since no creation API is provided
  const shipmentItemId = typia.random<string & tags.Format<"uuid">>();
  const updateBody = typia.random<IShoppingMallShipmentItem.IUpdate>();
  // Attempt to update shipment item without authorization (no login)
  await TestValidator.httpError(
    "unauthorized update shipment item",
    401,
    async () => {
      await api.functional.shoppingMall.seller.shipment_items.updateShipmentItem(
        connection, // base connection WITHOUT authorization header
        {
          shipmentItemId,
          body: updateBody,
        },
      );
    },
  );
}
