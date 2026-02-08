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

export async function test_api_shipment_item_erase_success_and_edge_cases(
  connection: api.IConnection,
): Promise<void> {
  // Scenario 1: Successful deletion of an existing shipment item by authorized seller.
  // Create a seller and authorize
  const sellerConnection: api.IConnection = { host: connection.host };
  const authorizedSeller = await authorize_seller_join(sellerConnection, {
    body: {},
  });
  sellerConnection.headers = { Authorization: authorizedSeller.token.access };
  // Create a shipment item
  const shipmentItemRaw =
    await generate_random_shopping_mall_seller_shipment_items_create(
      sellerConnection,
      { body: {} },
    );
  typia.assert(shipmentItemRaw);
  // Assuming shipmentItemRaw is IShoppingMallShipmentItem but without id, we assert with id
  const shipmentItem = shipmentItemRaw as IShoppingMallShipmentItem & { id: string };
  // Delete the shipment item
  await api.functional.shoppingMall.seller.shipment_items.erase(
    sellerConnection,
    {
      shipmentItemId: shipmentItem.id,
    },
  );
  // Attempt to delete the same shipment item again to confirm deletion
  await TestValidator.httpError(
    "delete already deleted shipment item",
    404,
    async () => {
      await api.functional.shoppingMall.seller.shipment_items.erase(
        sellerConnection,
        {
          shipmentItemId: shipmentItem.id,
        },
      );
    },
  );
  // Scenario 2: Attempted deletion with non-existent shipment item ID by seller
  // Generate random UUID
  const randomUuid = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "delete non-existent shipment item",
    404,
    async () => {
      await api.functional.shoppingMall.seller.shipment_items.erase(
        sellerConnection,
        {
          shipmentItemId: randomUuid,
        },
      );
    },
  );
  // Scenario 3: Unauthorized attempt to delete shipment item without authentication
  const unauthorizedConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError(
    "unauthorized delete shipment item",
    401,
    async () => {
      await api.functional.shoppingMall.seller.shipment_items.erase(
        unauthorizedConnection,
        {
          shipmentItemId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
}
