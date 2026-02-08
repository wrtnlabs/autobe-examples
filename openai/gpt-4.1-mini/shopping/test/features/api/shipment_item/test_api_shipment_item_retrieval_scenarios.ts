import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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
import { generate_random_shopping_mall_seller_shipments_create } from "../../../generate/generate_random_shopping_mall_seller_shipments_create";
import { prepare_random_shopping_mall_shipment } from "../../../prepare/prepare_random_shopping_mall_shipment";

export async function test_api_shipment_item_retrieval_scenarios(
  connection: api.IConnection,
): Promise<void> {
  // Scenario 1: Successfully retrieve shipment item details.
  // 1) Register new seller and authorize
  const sellerConnection: api.IConnection = { host: connection.host };
  const authorizedSeller = await authorize_seller_join(sellerConnection, {
    body: typia.random<IShoppingMallSeller.IJoin>(),
  });
  typia.assert(authorizedSeller);
  // Update sellerConnection with token
  sellerConnection.headers = { Authorization: authorizedSeller.token.access };
  // 2) Create a shipment by seller
  const createdShipment =
    await generate_random_shopping_mall_seller_shipments_create(
      sellerConnection,
      {},
    );
  typia.assert(createdShipment);
  // createdShipment should contain at least one shipment item
  // We pick one shipment item id to query
  const shipmentItems =
    (createdShipment as any).items ??
    (createdShipment as any).shipment_items ??
    undefined;
  if (!shipmentItems || shipmentItems.length === 0) {
    throw new Error("No shipment items found in created shipment");
  }
  // Assuming property name is "items" or fallback to "shipment_items" for the array
  const shipmentItem = shipmentItems[0];
  const shipmentItemId: string & tags.Format<"uuid"> =
    shipmentItem.shipment_item_id ?? shipmentItem.shipmentItemId ?? shipmentItem.id;
  if (!shipmentItemId) {
    throw new Error("Shipment item ID not found");
  }
  // 3) Retrieve shipment item details by shipmentItemId
  const retrievedShipmentItem =
    await api.functional.shoppingMall.seller.shipment_items.at(
      sellerConnection,
      { shipmentItemId },
    );
  typia.assert(retrievedShipmentItem);
  const retrievedShipmentItemId = (retrievedShipmentItem as any).shipment_item_id ?? (retrievedShipmentItem as any).shipmentItemId;
  if (!retrievedShipmentItemId) {
    throw new Error("Retrieved shipment item ID not found");
  }
  // 4) Validate the fetched shipment item ID matches requested
  TestValidator.equals(
    "Retrieved shipment item ID",
    retrievedShipmentItemId,
    shipmentItemId,
  );
  // Scenario 2: Attempt to retrieve shipment item with non-existing shipmentItemId.
  await TestValidator.httpError(
    "404 Not Found for unknown shipmentItemId",
    404,
    async () =>
      api.functional.shoppingMall.seller.shipment_items.at(sellerConnection, {
        shipmentItemId: typia.random<string & tags.Format<"uuid">>(),
      }),
  );
  // Scenario 3: Attempt to retrieve shipment item with unauthorized user.
  // Register a second seller
  const otherSellerConnection: api.IConnection = { host: connection.host };
  const otherAuthorizedSeller = await authorize_seller_join(
    otherSellerConnection,
    {
      body: typia.random<IShoppingMallSeller.IJoin>(),
    },
  );
  typia.assert(otherAuthorizedSeller);
  otherSellerConnection.headers = {
    Authorization: otherAuthorizedSeller.token.access,
  };
  // Attempt to retrieve shipmentItemId created by first seller with second seller's connection
  await TestValidator.httpError(
    "403 Forbidden for different seller",
    403,
    async () =>
      await api.functional.shoppingMall.seller.shipment_items.at(
        otherSellerConnection,
        {
          shipmentItemId,
        },
      ),
  );
  // Also attempt to retrieve without any auth
  const unauthConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError(
    "403 Forbidden for unauthorized access",
    403,
    async () =>
      await api.functional.shoppingMall.seller.shipment_items.at(
        unauthConnection,
        {
          shipmentItemId,
        },
      ),
  );
}
