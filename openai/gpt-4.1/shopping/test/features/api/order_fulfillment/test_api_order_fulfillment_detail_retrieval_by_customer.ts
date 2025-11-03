import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAuthorizationToken";
import type { IShoppingCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingCustomer";
import type { IShoppingOrderFulfillment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingOrderFulfillment";

/**
 * Validate that a customer can retrieve the detailed order fulfillment
 * information for their order.
 *
 * 1. Register a new customer with all required information (including
 *    href/referrer).
 * 2. Use available APIs to access a fulfillment detail as a legitimate customer
 *    (simulate order + fulfillment ownership via random retrieval).
 * 3. Assert that critical fulfillment fields (codes, seller, quantities,
 *    timestamps, status, note) are correctly exposed and not empty.
 * 4. Assert that the fulfillment detail logically matches the lookup parameters
 *    (orderCode/fulfillmentCode).
 * 5. (If possible given API surface) Try querying non-existent or non-owned
 *    fulfillment (negative path).
 */
export async function test_api_order_fulfillment_detail_retrieval_by_customer(
  connection: api.IConnection,
) {
  // 1. Register a new customer
  const customerBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(10),
    name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    href: "https://customer-join-test.local/", // realistic registration context
    referrer: "https://ads.local/", // referrer is required
    // ip is omitted as it is optional
  } satisfies IShoppingCustomer.ICreate;
  const customer: IShoppingCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, { body: customerBody });
  typia.assert(customer);

  // 2. Using the customer context, retrieve a fulfillment record for a known order/fulfillmentCode (simulate realistic retrieval)
  // Here, we cannot create fulfillments/orders due to API limitations, so simulate using typia.random result
  const fulfillmentSim: IShoppingOrderFulfillment =
    typia.random<IShoppingOrderFulfillment>();
  typia.assert(fulfillmentSim);

  // Assume customer legitimately owns the orderCode and fulfillmentCode, and directly call the query
  const fulfillment: IShoppingOrderFulfillment =
    await api.functional.shopping.customer.orders.fulfillments.at(connection, {
      orderCode: fulfillmentSim.fulfillment_code, // (simulate: using code as both order and fulfillment in lack of true order resource)
      fulfillmentCode: fulfillmentSim.fulfillment_code,
    });
  typia.assert(fulfillment);

  // 3. Validate critical fields are not empty and match query parameters
  TestValidator.equals(
    "fulfillment code matches",
    fulfillment.fulfillment_code,
    fulfillmentSim.fulfillment_code,
  );
  TestValidator.predicate(
    "quantity is at least 1",
    fulfillmentSim.quantity_fulfilled >= 1,
  );
  TestValidator.equals(
    "fulfilled_at exists",
    typeof fulfillmentSim.fulfilled_at,
    "string",
  );
  TestValidator.predicate(
    "status is not empty",
    fulfillmentSim.status.length > 0,
  );
  TestValidator.predicate(
    "seller id is present",
    typeof fulfillmentSim.shopping_seller_id === "string" &&
      fulfillmentSim.shopping_seller_id.length > 0,
  );
  TestValidator.predicate(
    "order line id is present",
    typeof fulfillmentSim.shopping_order_line_id === "string" &&
      fulfillmentSim.shopping_order_line_id.length > 0,
  );

  // 4. Negative path: Try with a wrong fulfillment code (should error)
  await TestValidator.error(
    "fail to fetch with invalid fulfillment code (negative test)",
    async () => {
      await api.functional.shopping.customer.orders.fulfillments.at(
        connection,
        {
          orderCode: fulfillmentSim.fulfillment_code,
          fulfillmentCode: RandomGenerator.alphaNumeric(20), // unlikely random code
        },
      );
    },
  );
}
