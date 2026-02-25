import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import type { IShoppingMallShipmentOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipmentOrderItem";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_seller_shipment_order_items_create } from "../../../generate/generate_random_shopping_mall_seller_shipment_order_items_create";
import { prepare_random_shopping_mall_shipment_order_item } from "../../../prepare/prepare_random_shopping_mall_shipment_order_item";

export async function test_api_shipment_order_item_creation_unauthorized(
  connection: api.IConnection,
): Promise<void> {
  // This test verifies that unauthenticated users cannot create shipment order items.
  // We attempt to create a shipment order item using the base connection without
  // any seller authentication, expecting the request to be rejected with a 401 Unauthorized error.
  // Prepare a random shipment order item create payload with dummy UUIDs
  const body: IShoppingMallShipmentOrderItem.ICreate = {
    shopping_mall_shipment_id: typia.random<string & tags.Format<"uuid">>(),
    shopping_mall_order_item_id: typia.random<string & tags.Format<"uuid">>(),
  };
  // Attempt to call the create endpoint without authentication and expect HTTP error 401
  await TestValidator.httpError(
    "unauthorized shipment order item creation",
    401,
    async () => {
      // Directly call the create method from API functional (no utility function used here to simulate unauthenticated call)
      await api.functional.shoppingMall.seller.shipmentOrderItems.create(
        connection,
        {
          body,
        },
      );
    },
  );
}
