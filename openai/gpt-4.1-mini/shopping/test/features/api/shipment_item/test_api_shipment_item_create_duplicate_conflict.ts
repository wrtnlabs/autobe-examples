import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import type { IShoppingMallShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipmentItem";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_seller_shipment_items_create } from "../../../generate/generate_random_shopping_mall_seller_shipment_items_create";
import { prepare_random_shopping_mall_shipment_item } from "../../../prepare/prepare_random_shopping_mall_shipment_item";

export async function test_api_shipment_item_create_duplicate_conflict(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller setup: authorize seller join and login
  const sellerJoinConnection: api.IConnection = { host: connection.host };
  const authorizedSeller = await authorize_seller_join(sellerJoinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Password123!",
      shopName: RandomGenerator.name(1),
    },
  });
  // Create a new connection with seller authorization token
  const sellerConnection: api.IConnection = { host: connection.host };
  sellerConnection.headers = { Authorization: authorizedSeller.token.access };
  // 2. Create shipment item with random valid data
  const shipmentItem =
    await generate_random_shopping_mall_seller_shipment_items_create(
      sellerConnection,
      {},
    );
  typia.assert(shipmentItem);
  // 3. Attempt to create the same shipment item again to trigger conflict error
  const duplicateBody: IShoppingMallShipmentItem.ICreate = {
    shipmentId: shipmentItem.shipmentId,
    orderItemId: shipmentItem.orderItemId,
  };
  await TestValidator.httpError(
    "duplicate shipment item conflict",
    409,
    async () => {
      await generate_random_shopping_mall_seller_shipment_items_create(
        sellerConnection,
        {
          body: duplicateBody,
        },
      );
    },
  );
}
