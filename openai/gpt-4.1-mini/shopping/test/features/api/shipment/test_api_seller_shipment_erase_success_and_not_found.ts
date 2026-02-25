import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
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

export async function test_api_seller_shipment_erase_success_and_not_found(
  connection: api.IConnection,
): Promise<void> {
  // Scenario: Successfully delete an existing shipment by a seller and verify deletion failure when shipment doesn't exist
  // 1. Seller join and obtain authorized connection
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuthorized = await authorize_seller_join(sellerConnection, {
    body: {},
  });
  typia.assert(sellerAuthorized);
  // Update connection headers with token
  sellerConnection.headers = { Authorization: sellerAuthorized.token.access };
  // 2. Create a shipment as the authenticated seller
  const shipment = await generate_random_shopping_mall_seller_shipments_create(
    sellerConnection,
    { body: {} },
  );
  typia.assert(shipment);
  // 3. Erase the existing shipment successfully
  await api.functional.shoppingMall.seller.shipments.erase(sellerConnection, {
    shipmentId: shipment.id,
  });
  // 4. Try to erase the same shipment again, expect error
  await TestValidator.error("delete non-existent shipment", async () => {
    await api.functional.shoppingMall.seller.shipments.erase(sellerConnection, {
      shipmentId: shipment.id,
    });
  });
  // 5. Try to erase a completely random, non-existent shipmentId
  const randomUuid = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error("delete non-existent random shipment", async () => {
    await api.functional.shoppingMall.seller.shipments.erase(sellerConnection, {
      shipmentId: randomUuid,
    });
  });
}
