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

export async function test_api_seller_shipment_item_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // Test the successful retrieval of a shipment item by shipmentItemId for an authenticated seller.
  // 1. Create a new seller using authorize_seller_join and get an authorized connection.
  // 2. Use an existing shipmentItemId from the system. Since no creation API for shipmentItem,
  //    the test retrieves a shipment item list and picks one, if list retrieval is possible.
  //    Here, assuming the seller has at least one shipment item, or using typia.random for fallback.
  // 3. Call atShipmentItem with the shipmentItemId
  // 4. Assert the response shape and validate nested summary fields.
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {},
  });
  sellerConnection.headers = {
    Authorization: `Bearer ${sellerAuth.token.access}`,
  };
  // As no API to list shipment items, we mock a random shipmentItemId; in real test env,
  // this would be fetched from actual data or test setup.
  const shipmentItemId = typia.random<string & tags.Format<"uuid">>();
  const shipmentItem =
    await api.functional.shoppingMall.seller.shipment_items.atShipmentItem(
      sellerConnection,
      { shipmentItemId },
    );
  typia.assert(shipmentItem);
  typia.assert(shipmentItem.shipment);
  typia.assert(shipmentItem.orderItem);
  typia.assert(shipmentItem.shipment.seller);
  // Validate seller ID in shipment matches authenticated seller ID
  TestValidator.equals(
    "Seller ID matches authenticated seller",
    shipmentItem.shipment.seller.id,
    sellerAuth.id,
  );
}
