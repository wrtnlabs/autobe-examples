import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallReturnShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallReturnShipment";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
import type { IShoppingMallReturnShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReturnShipment";

/**
 * Test retrieving a paginated list of return shipments by an authenticated
 * customer. This test performs the following steps:
 *
 * 1. Register a new customer account via the /auth/customer/join endpoint.
 * 2. Authenticate as the created customer and obtain the JWT authorization token.
 * 3. Use the authenticated connection to query the return shipments via
 *    /shoppingMall/customer/returnShipments endpoint.
 * 4. Provide various query parameters such as page, limit, filtering by status,
 *    carrier name, and tracking number.
 * 5. Verify that the returned data is paginated correctly with the expected
 *    pagination metadata.
 * 6. Validate that each return shipment in the list has correct and consistent
 *    properties.
 * 7. Confirm all return shipments belong to the authenticated customer only.
 *
 * The test ensures access control, data integrity, and proper pagination
 * functionalities of the return shipments API.
 */
export async function test_api_return_shipments_list_by_customer(
  connection: api.IConnection,
) {
  // Step 1: Register a new customer
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerPassword = "P@ssw0rd123";
  const customerNickname = RandomGenerator.name();
  const createBody = {
    email: customerEmail,
    password: customerPassword,
    nickname: customerNickname,
  } satisfies IShoppingMallCustomer.ICreate;

  const customer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, { body: createBody });
  typia.assert(customer);

  // Step 2: Query return shipments with valid filters and pagination
  const page = 1;
  const limit = 10;
  const possibleStatuses = [
    "requested",
    "in_transit",
    "received",
    "inspected",
    "completed",
  ] as const;
  const randomStatus = RandomGenerator.pick(possibleStatuses);

  const requestBody = {
    page: page satisfies number as number,
    limit: limit satisfies number as number,
    status: randomStatus,
    carrier_name: "FedEx",
    tracking_number: "TRACK123456",
  } satisfies IShoppingMallReturnShipment.IRequest;

  const returnShipmentsPage: IPageIShoppingMallReturnShipment.ISummary =
    await api.functional.shoppingMall.customer.returnShipments.index(
      connection,
      { body: requestBody },
    );
  typia.assert(returnShipmentsPage);

  // Step 3: Validate pagination metadata
  const pagination = returnShipmentsPage.pagination;
  TestValidator.equals(
    "pagination current page matches requested",
    pagination.current,
    page,
  );
  TestValidator.equals(
    "pagination limit matches requested",
    pagination.limit,
    limit,
  );
  TestValidator.predicate(
    "pagination pages count is non-negative",
    pagination.pages >= 0,
  );
  TestValidator.predicate(
    "pagination records count is non-negative",
    pagination.records >= 0,
  );

  // Step 4: Validate every return shipment summary item
  for (const shipment of returnShipmentsPage.data) {
    TestValidator.equals(
      "shipment belongs to customer",
      shipment.shopping_mall_customer_id,
      customer.id,
    );
    TestValidator.predicate(
      "shipment has valid uuid",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        shipment.id,
      ),
    );
    TestValidator.predicate(
      "shipment has valid refund request id",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        shipment.shopping_mall_refund_request_id,
      ),
    );
    TestValidator.predicate(
      "shipment return status is valid",
      possibleStatuses.includes(shipment.return_status as any),
    );
    TestValidator.predicate(
      "shipment carrier name is non-empty",
      typeof shipment.carrier_name === "string" &&
        shipment.carrier_name.length > 0,
    );
    TestValidator.predicate(
      "shipment tracking number is non-empty",
      typeof shipment.tracking_number === "string" &&
        shipment.tracking_number.length > 0,
    );
    TestValidator.predicate(
      "shipment created_at is ISO string",
      !isNaN(Date.parse(shipment.created_at)),
    );
    TestValidator.predicate(
      "shipment updated_at is ISO string",
      !isNaN(Date.parse(shipment.updated_at)),
    );
    // Optional refund request and customer summaries validation
    if (
      shipment.refundRequest !== undefined &&
      shipment.refundRequest !== null
    ) {
      typia.assert(shipment.refundRequest);
      TestValidator.equals(
        "refund request id match",
        shipment.refundRequest.id,
        shipment.shopping_mall_refund_request_id,
      );
    }
    if (shipment.customer !== undefined && shipment.customer !== null) {
      typia.assert(shipment.customer);
      TestValidator.equals(
        "customer id match",
        shipment.customer.id,
        shipment.shopping_mall_customer_id,
      );
    }
  }
}
