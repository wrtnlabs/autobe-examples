import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_order_retrieval_by_customer(
  connection: api.IConnection,
): Promise<void> {
  // Create customer connection and join
  const customerConnection: api.IConnection = { host: connection.host };
  const joinData: IShoppingMallCustomer.IJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
  };
  const authorizedCustomer = await authorize_customer_join(customerConnection, {
    body: joinData,
  });
  typia.assert(authorizedCustomer);
  // Use a known test order ID (simulated or pre-seeded in database)
  // We cannot create an order using provided API, so we assume it exists for this customer
  const testOrderId = "00000000-0000-4000-8000-000000000000";
  // Retrieve the order
  const retrievedOrder = await api.functional.shoppingMall.customer.orders.at(
    customerConnection,
    {
      orderId: testOrderId,
    },
  );
  typia.assert(retrievedOrder);
  // Validate top-level IShoppingMallOrder structure
  TestValidator.equals(
    "order id matches expected",
    retrievedOrder.id,
    testOrderId,
  );
  TestValidator.predicate(
    "total_price is a number",
    () => typeof retrievedOrder.total_price === "number",
  );
  TestValidator.predicate("status is one of allowed values", () =>
    [
      "paid",
      "shipped",
      "delivered",
      "cancelled",
      "refunded",
      "partially_completed",
    ].includes(retrievedOrder.status),
  );
  TestValidator.predicate("created_at is valid ISO datetime", () => {
    const date = new Date(retrievedOrder.created_at);
    return (
      !isNaN(date.getTime()) && date.toISOString() === retrievedOrder.created_at
    );
  });
  TestValidator.predicate("updated_at is valid ISO datetime", () => {
    const date = new Date(retrievedOrder.updated_at);
    return (
      !isNaN(date.getTime()) && date.toISOString() === retrievedOrder.updated_at
    );
  });
  TestValidator.equals(
    "customer_id matches",
    retrievedOrder.customer_id,
    authorizedCustomer.id,
  );
  TestValidator.predicate("shipping_address_id is valid uuid", () => {
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(retrievedOrder.shipping_address_id);
  });
  // Since items, shipments, and statusHistory are strings (per DTO), we cannot validate nested content
  // But we can validate they are not null/undefined
  TestValidator.predicate(
    "items is a string",
    () => typeof retrievedOrder.items === "string",
  );
  TestValidator.predicate(
    "shipments is a string",
    () => typeof retrievedOrder.shipments === "string",
  );
  TestValidator.predicate(
    "statusHistory is a string",
    () => typeof retrievedOrder.statusHistory === "string",
  );
}
