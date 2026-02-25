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

export async function test_api_shipment_item_create_authorization_failure(
  connection: api.IConnection,
): Promise<void> {
  // Setup two sellers for testing unauthorized access
  // Seller A join and get connection
  const sellerAConnection: api.IConnection = { host: connection.host };
  const sellerA = await authorize_seller_join(sellerAConnection, { body: {} });
  typia.assert(sellerA);
  // Seller B join and get connection
  const sellerBConnection: api.IConnection = { host: connection.host };
  const sellerB = await authorize_seller_join(sellerBConnection, { body: {} });
  typia.assert(sellerB);
  // Seller A creates a shipment item resource to get valid shipmentId and orderItemId
  // Use generate_random_shopping_mall_seller_shipment_items_create utility function for creation
  const shipmentItem =
    await generate_random_shopping_mall_seller_shipment_items_create(
      sellerAConnection,
      {
        body: {},
      },
    );
  typia.assert(shipmentItem);
  // Attempt to create shipment item with Seller B credentials - should fail authorization
  await TestValidator.httpError(
    "unauthorized creation by different seller",
    401,
    async () => {
      await generate_random_shopping_mall_seller_shipment_items_create(
        sellerBConnection,
        {
          body: {
            shipmentId: shipmentItem.shipmentId,
            orderItemId: shipmentItem.orderItemId,
          },
        },
      );
    },
  );
  // Attempt to create shipment item with base connection (unauthenticated) - should fail authorization
  await TestValidator.httpError(
    "unauthorized creation without authentication",
    401,
    async () => {
      await generate_random_shopping_mall_seller_shipment_items_create(
        connection,
        {
          body: {
            shipmentId: shipmentItem.shipmentId,
            orderItemId: shipmentItem.orderItemId,
          },
        },
      );
    },
  );
}
