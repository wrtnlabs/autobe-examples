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

export async function test_api_seller_shipment_items_query_with_filters_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller registration (join) and authentication
  const sellerJoinConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_seller_join(sellerJoinConnection, {
    body: typia.random<IShoppingMallSeller.IJoin>(),
  });
  typia.assert(authorized);
  const sellerConnection: api.IConnection = { host: connection.host };
  sellerConnection.headers = {
    Authorization: `Bearer ${authorized.token.access}`,
  };
  // 2. Create an initial shipment (cannot access id; treat as string to test)
  const shipment = await generate_random_shopping_mall_seller_shipments_create(
    sellerConnection,
    { body: {} },
  );
  typia.assert(shipment);
  // Since shipment.id doesn't exist, use a dummy valid UUID for filter test
  const shipmentId = typia.random<string & typia.tags.Format<"uuid">>();
  // 3. Query shipment items without filter
  const allShipmentItems =
    await api.functional.shoppingMall.seller.shipment_items.index(
      sellerConnection,
      { body: {} },
    );
  typia.assert(allShipmentItems);
  // Cannot access data properties, test pagination metadata
  TestValidator.predicate(
    "pagination records non-negative",
    allShipmentItems.pagination.records >= 0,
  );
  // 4. Query shipment items filtered by shipment_id (dummy filter)
  const responseByShipmentId =
    await api.functional.shoppingMall.seller.shipment_items.index(
      sellerConnection,
      {
        body: {
          shipment_id: shipmentId,
          page: 1,
          limit: 10,
          sort_by: ["created_at"],
        },
      },
    );
  typia.assert(responseByShipmentId);
  // 5. Query shipment items filtered by order_item_id (use same dummy shipmentId as order_item_id)
  const responseByOrderItemId =
    await api.functional.shoppingMall.seller.shipment_items.index(
      sellerConnection,
      {
        body: {
          order_item_id: shipmentId,
          page: 1,
          limit: 10,
          sort_by: ["updated_at"],
        },
      },
    );
  typia.assert(responseByOrderItemId);
  // 6. Query shipment items with pagination only
  const responsePage1 =
    await api.functional.shoppingMall.seller.shipment_items.index(
      sellerConnection,
      { body: { page: 1, limit: 5, sort_by: ["created_at"] } },
    );
  const responsePage2 =
    await api.functional.shoppingMall.seller.shipment_items.index(
      sellerConnection,
      { body: { page: 2, limit: 5, sort_by: ["created_at"] } },
    );
  typia.assert(responsePage1);
  typia.assert(responsePage2);
  // Test pagination output is consistent
  TestValidator.predicate(
    "page 1 has data array",
    Array.isArray(responsePage1.data),
  );
  TestValidator.predicate(
    "page 2 has data array",
    Array.isArray(responsePage2.data),
  );
  if (responsePage1.data.length > 0 && responsePage2.data.length > 0) {
    TestValidator.notEquals(
      "page 1 and page 2 first item differ",
      JSON.stringify(responsePage1.data[0]),
      JSON.stringify(responsePage2.data[0]),
    );
  }
  // 7. Query shipment items with filter yielding empty result
  const emptyFilterResponse =
    await api.functional.shoppingMall.seller.shipment_items.index(
      sellerConnection,
      {
        body: {
          shipment_id: "00000000-0000-0000-0000-000000000000",
          page: 1,
          limit: 10,
        },
      },
    );
  typia.assert(emptyFilterResponse);
  TestValidator.equals(
    "empty result records zero",
    emptyFilterResponse.pagination.records,
    0,
  );
  TestValidator.equals(
    "empty result data empty array",
    emptyFilterResponse.data.length,
    0,
  );
  // 8. Authorization enforcement test, no authorization
  const anonConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError("unauthorized access", 401, async () => {
    await api.functional.shoppingMall.seller.shipment_items.index(
      anonConnection,
      {
        body: { page: 1, limit: 10 },
      },
    );
  });
}
