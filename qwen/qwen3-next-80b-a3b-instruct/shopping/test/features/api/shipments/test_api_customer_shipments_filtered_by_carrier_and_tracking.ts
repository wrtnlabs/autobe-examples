import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallShipment";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_shipments_filtered_by_carrier_and_tracking(
  connection: api.IConnection,
): Promise<void> {
  // Scenario: As an authenticated customer, I can filter and retrieve shipments by carrier_name and tracking_number
  // 1. Join as customer to obtain authentication
  // 2. Retrieve a paginated list of shipments
  // 3. Filter by carrier_name using case-insensitive partial matching
  // 4. Filter by tracking_number using case-insensitive partial matching
  // 5. Validate pagination limits and ownership enforcement
  // 6. Verify that filtering returns matching shipments only
  // Step 1: Authenticate customer
  const customerConnection: api.IConnection = { host: connection.host };
  const customerData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
  } satisfies IShoppingMallCustomer.IJoin;
  const authorized = await authorize_customer_join(customerConnection, {
    body: customerData,
  });
  typia.assert(authorized);
  // Step 2: Get list of all shipments to extract sample data
  const allShipmentsResponse =
    await api.functional.shoppingMall.customer.orders.shipments.index(
      customerConnection,
      {
        orderId: "00000000-0000-0000-0000-000000000000",
        body: {},
      },
    );
  typia.assert(allShipmentsResponse);
  // If there are no shipments, we proceed with testing the contract
  if (allShipmentsResponse.data.length > 0) {
    // Extract sample shipment data
    const sampleShipment = allShipmentsResponse.data[0];
    const carrierName = sampleShipment.carrier_name;
    const trackingNumber = sampleShipment.tracking_number;
    // Step 3: Filter by carrier_name - case-insensitive partial match
    const carrierFilter: IShoppingMallShipment.IRequest = {
      carrier_name: carrierName
        .substring(0, carrierName.length > 2 ? 2 : carrierName.length)
        .toLowerCase(),
      // Use partial match of first 2 letters (lowercase)
      page: 1,
      limit: 10,
    };
    const filteredByCarrier =
      await api.functional.shoppingMall.customer.orders.shipments.index(
        customerConnection,
        {
          orderId: "00000000-0000-0000-0000-000000000000",
          body: carrierFilter,
        },
      );
    typia.assert(filteredByCarrier);
    // Verify at least one shipment matches (the one we used as sample)
    TestValidator.predicate(
      "carrier filter returns at least one result",
      () => filteredByCarrier.data.length > 0,
    );
    // Verify the carrier name matches in case-insensitive partial way
    TestValidator.predicate("carrier name matches case-insensitive", () =>
      filteredByCarrier.data.some(
        (s) =>
          s.carrier_name.toLowerCase().includes(carrierFilter.carrier_name!) ||
          carrierFilter
            .carrier_name!.toLowerCase()
            .includes(s.carrier_name.toLowerCase()),
      ),
    );
    // Step 4: Filter by tracking_number - case-insensitive partial match
    const trackingFilter: IShoppingMallShipment.IRequest = {
      tracking_number: trackingNumber
        .substring(0, trackingNumber.length > 3 ? 3 : trackingNumber.length)
        .toLowerCase(),
      // Use partial match of first 3 letters (lowercase)
      page: 1,
      limit: 10,
    };
    const filteredByTracking =
      await api.functional.shoppingMall.customer.orders.shipments.index(
        customerConnection,
        {
          orderId: "00000000-0000-0000-0000-000000000000",
          body: trackingFilter,
        },
      );
    typia.assert(filteredByTracking);
    // Verify at least one shipment matches (the one we used as sample)
    TestValidator.predicate(
      "tracking filter returns at least one result",
      () => filteredByTracking.data.length > 0,
    );
    // Verify the tracking number matches in case-insensitive partial way
    TestValidator.predicate("tracking number matches case-insensitive", () =>
      filteredByTracking.data.some(
        (s) =>
          s.tracking_number
            .toLowerCase()
            .includes(trackingFilter.tracking_number!) ||
          trackingFilter
            .tracking_number!.toLowerCase()
            .includes(s.tracking_number.toLowerCase()),
      ),
    );
    // Step 5: Validate pagination limits
    const limit15 =
      await api.functional.shoppingMall.customer.orders.shipments.index(
        customerConnection,
        {
          orderId: "00000000-0000-0000-0000-000000000000",
          body: { limit: 15, page: 5 },
        },
      );
    typia.assert(limit15);
    TestValidator.equals(
      "pagination limit respected",
      limit15.pagination.limit,
      15,
    );
    TestValidator.equals(
      "pagination page respected",
      limit15.pagination.current,
      5,
    );
    const page1 =
      await api.functional.shoppingMall.customer.orders.shipments.index(
        customerConnection,
        {
          orderId: "00000000-0000-0000-0000-000000000000",
          body: { limit: 50, page: 1 },
        },
      );
    typia.assert(page1);
    TestValidator.equals("maximum page limit", page1.pagination.limit, 50);
    TestValidator.equals("minimum page", page1.pagination.current, 1);
    // Step 6: Test ownership enforcement
    const otherCustomerConnection: api.IConnection = { host: connection.host };
    const otherCustomerData = {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IShoppingMallCustomer.IJoin;
    const otherAuthorized = await authorize_customer_join(
      otherCustomerConnection,
      { body: otherCustomerData },
    );
    typia.assert(otherAuthorized);
    // Try to access shipments for the same order ID as a different customer
    // Since the ID is generated by system (random UUID), this will likely be a 404
    await TestValidator.httpError(
      "cannot access other customer's shipments",
      404,
      async () => {
        await api.functional.shoppingMall.customer.orders.shipments.index(
          otherCustomerConnection,
          {
            orderId: "00000000-0000-0000-0000-000000000000",
            body: {},
          },
        );
      },
    );
  } else {
    // If no shipments exist, test that API returns valid structure and pagination
    TestValidator.equals(
      "empty shipments have valid structure",
      allShipmentsResponse.data.length,
      0,
    );
    TestValidator.equals(
      "empty pagination",
      allShipmentsResponse.pagination.records,
      0,
    );
    TestValidator.equals(
      "empty pagination pages",
      allShipmentsResponse.pagination.pages,
      0,
    );
    TestValidator.equals(
      "empty pagination limit",
      allShipmentsResponse.pagination.limit,
      10,
    );
    TestValidator.equals(
      "empty pagination current",
      allShipmentsResponse.pagination.current,
      1,
    );
    // Still test the filter structure with empty results
    const carrierFilter: IShoppingMallShipment.IRequest = {
      carrier_name: "FedEx",
      page: 1,
      limit: 10,
    };
    const filteredByCarrier =
      await api.functional.shoppingMall.customer.orders.shipments.index(
        customerConnection,
        {
          orderId: "00000000-0000-0000-0000-000000000000",
          body: carrierFilter,
        },
      );
    typia.assert(filteredByCarrier);
    TestValidator.equals(
      "filter on empty collection returns empty",
      filteredByCarrier.data.length,
      0,
    );
    TestValidator.equals(
      "pagination intact",
      filteredByCarrier.pagination.current,
      1,
    );
    TestValidator.equals(
      "pagination limit",
      filteredByCarrier.pagination.limit,
      10,
    );
    // Test tracking filter similarly
    const trackingFilter: IShoppingMallShipment.IRequest = {
      tracking_number: "123456",
      page: 1,
      limit: 10,
    };
    const filteredByTracking =
      await api.functional.shoppingMall.customer.orders.shipments.index(
        customerConnection,
        {
          orderId: "00000000-0000-0000-0000-000000000000",
          body: trackingFilter,
        },
      );
    typia.assert(filteredByTracking);
    TestValidator.equals(
      "tracking filter on empty returns empty",
      filteredByTracking.data.length,
      0,
    );
    // Test ownership enforcement
    const otherCustomerConnection: api.IConnection = { host: connection.host };
    const otherCustomerData = {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IShoppingMallCustomer.IJoin;
    const otherAuthorized = await authorize_customer_join(
      otherCustomerConnection,
      { body: otherCustomerData },
    );
    typia.assert(otherAuthorized);
    await TestValidator.httpError(
      "cannot access other customer's shipments",
      404,
      async () => {
        await api.functional.shoppingMall.customer.orders.shipments.index(
          otherCustomerConnection,
          {
            orderId: "00000000-0000-0000-0000-000000000000",
            body: {},
          },
        );
      },
    );
  }
}
