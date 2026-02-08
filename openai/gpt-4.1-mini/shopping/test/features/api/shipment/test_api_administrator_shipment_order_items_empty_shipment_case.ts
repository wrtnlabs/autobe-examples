import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallOrderItem";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import type { IShoppingMallShipmentOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipmentOrderItem";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_seller_shipments_create } from "../../../generate/generate_random_shopping_mall_seller_shipments_create";
import { prepare_random_shopping_mall_shipment } from "../../../prepare/prepare_random_shopping_mall_shipment";

export async function test_api_administrator_shipment_order_items_empty_shipment_case(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator join (and implicitly login) to get token
  const adminConnection: api.IConnection = { host: connection.host };
  const adminJoinBody: IShoppingMallAdministrator.IJoin = typia.random<IShoppingMallAdministrator.IJoin>();
  const adminAuthorized = await authorize_administrator_join(adminConnection, {
    body: adminJoinBody,
  });
  typia.assert(adminAuthorized);
  adminConnection.headers = { Authorization: adminAuthorized.token.access };
  // 2. Seller join (and implicitly login) to get token
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerJoinBody: IShoppingMallSeller.IJoin = typia.random<IShoppingMallSeller.IJoin>();
  const sellerAuthorized = await authorize_seller_join(sellerConnection, {
    body: sellerJoinBody,
  });
  typia.assert(sellerAuthorized);
  sellerConnection.headers = { Authorization: sellerAuthorized.token.access };
  // 3. Seller creates a shipment with no order items (empty order items list)
  const shipmentCreateBody = typia.random<IShoppingMallShipment.ICreate>();
  // Ensure order items are empty, if property exists
  // But since schema for shipment create is empty {}, we just use random body
  const shipment = await generate_random_shopping_mall_seller_shipments_create(
    sellerConnection,
    { body: shipmentCreateBody },
  );
  typia.assert(shipment);
  // 4. Administrator queries shipment order items for this shipment
  // Cast shipment as unknown to a type with 'id' property for accessing shipment.id
  const shipmentWithId = shipment as unknown as { id: string };
  const result =
    await api.functional.shoppingMall.administrator.shipments.order_items.index(
      adminConnection,
      {
        shipmentId: shipmentWithId.id,
        body: {},
      },
    );
  typia.assert(result);
  // 5. Validate that the result is an empty page
  TestValidator.equals(
    "shipment order items data length",
    result.data.length,
    0,
  );
  TestValidator.equals(
    "shipment order items pagination current",
    result.pagination.current,
    1,
  );
  TestValidator.equals(
    "shipment order items pagination records",
    result.pagination.records,
    0,
  );
  TestValidator.equals(
    "shipment order items pagination pages",
    result.pagination.pages,
    0,
  );
  // limit might be default 10 or server configured, we do not assert here
}
