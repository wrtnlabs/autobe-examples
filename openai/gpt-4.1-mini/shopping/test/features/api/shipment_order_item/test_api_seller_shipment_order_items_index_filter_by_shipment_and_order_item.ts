import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallShipmentOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallShipmentOrderItem";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
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

export async function test_api_seller_shipment_order_items_index_filter_by_shipment_and_order_item(
  connection: api.IConnection,
): Promise<void> {
  // Scenario: Test filtering shipment order items by shipment ID and order item ID.
  // 1. Seller joins and authenticates
  // 2. Fetch some shipment order items unfiltered (page 1, limit 10) to obtain valid shipmentId and orderItemId
  // 3. Use the obtained shipmentId and orderItemId to filter results
  // 4. Assert every returned item matches the shipmentId and orderItemId filter
  // 5. Assert pagination correctness and data integrity
  // 1. Seller joins and authenticates
  const sellerJoinConnection: api.IConnection = { host: connection.host };
  const sellerAuthorized = await authorize_seller_join(sellerJoinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Test1234!",
      shopName: "TestShop",
      shopDescription: "Test shop description",
      logoUri: null,
    },
  });
  // Create new connection with authorization token
  const sellerConnection: api.IConnection = { host: connection.host };
  sellerConnection.headers = {
    Authorization: `Bearer ${sellerAuthorized.token.access}`,
  };
  // 2. Fetch some shipment order items unfiltered to get valid IDs
  const unfilteredResponse =
    await api.functional.shoppingMall.seller.shipmentOrderItems.index(
      sellerConnection,
      {
        body: {
          page: 1,
          limit: 10,
        },
      },
    );
  typia.assert(unfilteredResponse);
  // If no data at all, skip rest of test with predicate assertion
  await TestValidator.predicate(
    "at least one shipment order item exists",
    unfilteredResponse.data.length > 0,
  );
  const sampleItem = unfilteredResponse.data[0];
  const shipmentId = sampleItem.shoppingMallShipmentId;
  const orderItemId = sampleItem.shoppingMallOrderItemId;
  // 3. Filter by shipmentId and orderItemId
  const filterResponse =
    await api.functional.shoppingMall.seller.shipmentOrderItems.index(
      sellerConnection,
      {
        body: {
          shipmentId: shipmentId,
          orderItemId: orderItemId,
          page: 1,
          limit: 10,
        },
      },
    );
  typia.assert(filterResponse);
  // 4. Assert each item matches the filter criteria
  for (const item of filterResponse.data) {
    TestValidator.equals(
      "shipmentId matches filter",
      item.shoppingMallShipmentId,
      shipmentId,
    );
    TestValidator.equals(
      "orderItemId matches filter",
      item.shoppingMallOrderItemId,
      orderItemId,
    );
  }
  // 5. Assert pagination consistency
  TestValidator.predicate(
    "pagination current page is 1",
    filterResponse.pagination.current === 1,
  );
  TestValidator.predicate(
    "pagination limit is 10",
    filterResponse.pagination.limit === 10,
  );
  TestValidator.predicate(
    "pagination pages is positive or zero",
    filterResponse.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "pagination records count is non-negative",
    filterResponse.pagination.records >= 0,
  );
  // Additional: validate that data length is less or equal to limit
  TestValidator.predicate(
    "data length <= limit",
    filterResponse.data.length <= filterResponse.pagination.limit,
  );
}
