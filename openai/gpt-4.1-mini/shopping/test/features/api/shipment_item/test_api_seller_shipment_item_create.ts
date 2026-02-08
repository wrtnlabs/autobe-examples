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
import { generate_random_shopping_mall_seller_shipment_items_create } from "../../../generate/generate_random_shopping_mall_seller_shipment_items_create";
import { prepare_random_shopping_mall_shipment_item } from "../../../prepare/prepare_random_shopping_mall_shipment_item";

export async function test_api_seller_shipment_item_create(
  connection: api.IConnection,
): Promise<void> {
  // Scenario 1: Successfully create a shipment item linking an order item to an existing shipment.
  // - Authenticate as a seller by joining first.
  // - Prepare a valid shipment ID that exists and a valid order item ID.
  // - Submit a POST request to /shoppingMall/seller/shipment-items with shipment_id and order_item_id.
  // - Expect a 201 Created response with the shipment item record including unique id, created_at, updated_at.
  // - Verify the database contains the new shipment item linking the shipment and order item.
  // - Validate that the shipment item cannot be duplicated: submitting same shipment_id and order_item_id again should return an error (e.g., 409 Conflict).
  // Authenticate as seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: typia.random<IShoppingMallSeller.IJoin>(),
  });
  typia.assert(sellerAuth);
  sellerConnection.headers = {
    Authorization: `Bearer ${sellerAuth.token.access}`,
  };
  // Prepare a valid shipment item creation body
  const createBody1 = prepare_random_shopping_mall_shipment_item();
  // Create first shipment item
  const createdItem1 =
    await api.functional.shoppingMall.seller.shipment_items.create(
      sellerConnection,
      {
        body: createBody1,
      },
    );
  typia.assert(createdItem1);
  // Attempt to create the same shipment item again to trigger duplication error
  await TestValidator.error("duplicate shipment item", async () => {
    await api.functional.shoppingMall.seller.shipment_items.create(
      sellerConnection,
      {
        body: createBody1,
      },
    );
  });
  // Create a new shipment item with new body
  const createBody2 = prepare_random_shopping_mall_shipment_item();
  const createdItem2 =
    await api.functional.shoppingMall.seller.shipment_items.create(
      sellerConnection,
      {
        body: createBody2,
      },
    );
  typia.assert(createdItem2);
  // Scenario 2: Creating a shipment item without seller authorization is rejected
  const noAuthConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError(
    "unauthorized shipment item creation",
    401,
    async () => {
      await api.functional.shoppingMall.seller.shipment_items.create(
        noAuthConnection,
        {
          body: createBody2,
        },
      );
    },
  );
  // Scenario 3: Creating with invalid shipment_id or order_item_id references
  const invalidBody1 = {
    ...createBody2,
    shipment_id: typia.random<string & tags.Format<"uuid">>(),
  };
  await TestValidator.httpError(
    "invalid shipment_id reference",
    [400, 404],
    async () => {
      await api.functional.shoppingMall.seller.shipment_items.create(
        sellerConnection,
        {
          body: invalidBody1,
        },
      );
    },
  );
  const invalidBody2 = {
    ...createBody2,
    order_item_id: typia.random<string & tags.Format<"uuid">>(),
  };
  await TestValidator.httpError(
    "invalid order_item_id reference",
    [400, 404],
    async () => {
      await api.functional.shoppingMall.seller.shipment_items.create(
        sellerConnection,
        {
          body: invalidBody2,
        },
      );
    },
  );
}
