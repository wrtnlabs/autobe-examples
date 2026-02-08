import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallShipmentItem";
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

export async function test_api_seller_shipment_items_query_empty_result(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller join and get authorized connection
  const sellerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_seller_join(sellerConnection, {
    body: typia.random<IShoppingMallSeller.IJoin>(),
  });
  typia.assert(authorized);
  sellerConnection.headers = { Authorization: authorized.token.access };
  // 2. Create a shipment (required prerequisite)
  const shipment = await generate_random_shopping_mall_seller_shipments_create(
    sellerConnection,
    {
      body: {},
    },
  );
  typia.assert(shipment);
  // 3. Query shipment items with filters that do not match anything
  // Use shipment_id which is unlikely to have any shipment items
  const body: IShoppingMallShipmentItem.IRequest = {};
  const output = await api.functional.shoppingMall.seller.shipment_items.index(
    sellerConnection,
    {
      body,
    },
  );
  typia.assert(output);
  // Validate that data is empty array and pagination reflects empty state
  TestValidator.equals("empty data length", output.data.length, 0);
  TestValidator.equals("pagination records", output.pagination.records, 0);
  TestValidator.equals("pagination pages", output.pagination.pages, 0);
  TestValidator.equals("pagination current page", output.pagination.current, 1);
  TestValidator.predicate(
    "pagination limit non-negative",
    output.pagination.limit >= 0,
  );
}
