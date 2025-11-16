import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallShipment";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";

export async function test_api_shopping_mall_shipment_search_by_customer(
  connection: api.IConnection,
) {
  // 1. Register new customer via join endpoint
  const customerPayload = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "1234",
    full_name: RandomGenerator.name(),
    ip: null,
    href: "https://example.com/signup",
    referrer: "https://example.com",
  } satisfies IShoppingMallCustomer.ICreate;
  const customer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerPayload,
    });
  typia.assert(customer);

  // 2. Create a shopping mall order for the authenticated customer
  const orderPayload = {
    order_number: RandomGenerator.alphaNumeric(12),
    status: "pending",
    payment_status: "pending",
    total_amount: 10000,
  } satisfies IShoppingMallOrder.ICreate;

  const order: IShoppingMallOrder =
    await api.functional.shoppingMall.customer.shoppingMallOrders.create(
      connection,
      {
        body: orderPayload,
      },
    );
  typia.assert(order);

  // 3. Purchase shipments with filters for the authenticated customer
  // Test shipment search with filters: status and shipping_method
  const shipmentSearchRequest = {
    page: 1,
    limit: 10,
    status: "pending",
    shipping_method: null,
    order_id: order.id,
    search: null,
    start_date: null,
    end_date: null,
  } satisfies IShoppingMallShipment.IRequest;

  const shipmentPage: IPageIShoppingMallShipment.ISummary =
    await api.functional.shoppingMall.customer.shoppingMallShipments.index(
      connection,
      {
        body: shipmentSearchRequest,
      },
    );
  typia.assert(shipmentPage);

  TestValidator.predicate("shipments belong to the created order", () => {
    return shipmentPage.data.every(
      (shipment) => shipment.order_id === order.id,
    );
  });

  TestValidator.predicate("shipment statuses match filter", () => {
    return shipmentPage.data.every((shipment) => shipment.status === "pending");
  });
}
