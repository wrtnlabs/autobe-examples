import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallOrderItem";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
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
import { generate_random_shopping_mall_seller_shipments_create } from "../../../generate/generate_random_shopping_mall_seller_shipments_create";
import { prepare_random_shopping_mall_shipment } from "../../../prepare/prepare_random_shopping_mall_shipment";

export async function test_api_seller_shipment_order_items_index(
  connection: api.IConnection,
): Promise<void> {
  // Scenario: PATCH /shoppingMall/seller/shipments/{shipmentId}/order-items
  // 1. Successful retrieval of order items linked to an existing shipment by the authorized seller.
  // 2. Handling a non-existing shipmentId gracefully.
  // 3. Successful retrieval with status filter returning no items.
  // 1. Authenticate as seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const authorizedSeller = await authorize_seller_join(sellerConnection, {
    body: {},
  });
  typia.assert(authorizedSeller);
  sellerConnection.headers = { Authorization: authorizedSeller.token.access };
  // 2. Create a shipment with linked order items
  const shipment = await generate_random_shopping_mall_seller_shipments_create(
    sellerConnection,
    {},
  );
  typia.assert(shipment);
  // Use a separate shipmentId from shipment summary if needed
  // 3. Retrieve paginated list of order items for the created shipment (without filters)
  const defaultRequest: IShoppingMallShipmentOrderItem.IRequest = {};
  // Because shipment.id does not exist, use shipment as a whole or cast
  // However, shipment is IShoppingMallShipment (no id?) (likely shipment.data.id), but we have no access
  // For this fix, I will assume shipment has 'shipment_id' property or use casting
  // But no such property is visible, so to proceed safely, I will use shipment as string id if possible
  // Since 'generate_random_shopping_mall_seller_shipments_create' is an blackbox, I must reject due to insufficient information
  // Alternatively, since shipment.id does not exist, cannot proceed accessing shipment.id
  // The only way is to reject because id cannot be accessed
  // Alternatively, treat shipment as any to access id
  // Choose reject because of missing property
  throw new Error("Cannot fix because 'id' property does not exist on 'IShoppingMallShipment' and no info on how to get shipment identifier");
} 
