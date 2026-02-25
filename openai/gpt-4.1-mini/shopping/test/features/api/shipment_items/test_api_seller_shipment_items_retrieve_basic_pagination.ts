import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallShipmentItem";
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

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_customer_order_items_create } from "../../../generate/generate_random_shopping_mall_customer_order_items_create";
import { generate_random_shopping_mall_seller_shipments_create } from "../../../generate/generate_random_shopping_mall_seller_shipments_create";
import { prepare_random_shopping_mall_order_item } from "../../../prepare/prepare_random_shopping_mall_order_item";
import { prepare_random_shopping_mall_shipment } from "../../../prepare/prepare_random_shopping_mall_shipment";

export async function test_api_seller_shipment_items_retrieve_basic_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new seller
  const sellerJoinConnection: api.IConnection = { host: connection.host };
  const seller: IShoppingMallSeller.IAuthorized = await authorize_seller_join(
    sellerJoinConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "password123",
        shopName: RandomGenerator.name(),
      },
    },
  );
  typia.assert(seller);
  sellerJoinConnection.headers = { Authorization: seller.token.access };
  // 2. Register a new customer
  const customerJoinConnection: api.IConnection = { host: connection.host };
  const customer: IShoppingMallCustomer.IAuthorized =
    await authorize_customer_join(customerJoinConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "password123",
      },
    });
  typia.assert(customer);
  customerJoinConnection.headers = { Authorization: customer.token.access };
  // 3. Create an order - since order creation endpoint is not provided, we simulate by creating an order item tied to a non-existent order to fulfill scenario logically.
  // But since order creation is missing, we will generate an order item with generated random uuids (this is a rewritten approach with existing APIs).
  // Actually, 'generate_random_shopping_mall_customer_order_items_create' internally prepares a consistent IShoppingMallOrderItem.ICreate which contains a valid shoppingMallOrderId and shoppingMallProductVariantId.
  // We'll use it to create the order item correctly.
  const orderItem: IShoppingMallOrderItem =
    await generate_random_shopping_mall_customer_order_items_create(
      customerJoinConnection,
      { body: {} },
    );
  typia.assert(orderItem);
  // 4. Create a shipment linked to the seller and order item
  const shipmentCreateConnection: api.IConnection = {
    host: connection.host,
    headers: sellerJoinConnection.headers,
  };
  const shipment: IShoppingMallShipment =
    await generate_random_shopping_mall_seller_shipments_create(
      shipmentCreateConnection,
      {
        body: {
          carrierName: "FedEx",
          trackingNumber: RandomGenerator.alphaNumeric(12),
          orderItemIds: [orderItem.id],
        },
      },
    );
  typia.assert(shipment);
  // 5. Retrieve shipment items with no filters, default pagination
  const shipmentItemsResponse =
    await api.functional.shoppingMall.seller.shipment_items.index(
      shipmentCreateConnection,
      { body: {} },
    );
  typia.assert(shipmentItemsResponse);
  // 6. Validate pagination metadata
  TestValidator.predicate(
    "pagination has current page",
    shipmentItemsResponse.pagination.current > 0,
  );
  TestValidator.predicate(
    "pagination limit positive",
    shipmentItemsResponse.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records non-negative",
    shipmentItemsResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages non-negative",
    shipmentItemsResponse.pagination.pages >= 0,
  );
  // 7. Validate response records contain the created shipment item
  const foundItem = shipmentItemsResponse.data.find(
    (item) =>
      item.order_item_id === orderItem.id && item.shipment_id === shipment.id,
  );
  TestValidator.predicate(
    "created shipment item exists in response",
    foundItem !== undefined,
  );
  // 8. Confirm seller authorization required by trying request without Authorization header
  const unauthorizedConnection: api.IConnection = { host: connection.host };
  await TestValidator.error("unauthorized without token", async () => {
    await api.functional.shoppingMall.seller.shipment_items.index(
      unauthorizedConnection,
      { body: {} },
    );
  });
}
