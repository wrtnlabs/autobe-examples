import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
import type { IShoppingMallReturnShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReturnShipment";

export async function test_api_return_shipment_detail_by_customer(
  connection: api.IConnection,
) {
  // Step 1: Customer registration
  const email = typia.random<string & tags.Format<"email">>();
  const password = "1234";
  const nickname = RandomGenerator.name();

  const customer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: {
        email,
        password,
        nickname,
      } satisfies IShoppingMallCustomer.ICreate,
    });
  typia.assert(customer);

  // Step 2: Attempt to retrieve a return shipment detail by a valid shipment id
  // For test, use customer id and a random UUID to simulate a shipment ID.
  const returnShipment: IShoppingMallReturnShipment =
    await api.functional.shoppingMall.customer.returnShipments.at(connection, {
      id: typia.random<string & tags.Format<"uuid">>(),
    });
  typia.assert(returnShipment);

  // Step 3: Validate the return shipment data fields with TestValidator
  TestValidator.equals(
    "Return shipment customer ID matches authenticated customer",
    returnShipment.shopping_mall_customer_id,
    customer.id,
  );

  TestValidator.predicate(
    "Carrier name is a non-empty string",
    typeof returnShipment.carrier_name === "string" &&
      returnShipment.carrier_name.length > 0,
  );

  TestValidator.predicate(
    "Tracking number is a non-empty string",
    typeof returnShipment.tracking_number === "string" &&
      returnShipment.tracking_number.length > 0,
  );

  TestValidator.predicate(
    "Return status is a string",
    typeof returnShipment.return_status === "string",
  );

  // Related refund request summary should be either undefined or a valid summary
  if (returnShipment.refundRequest !== undefined) {
    typia.assert(returnShipment.refundRequest);
    TestValidator.predicate(
      "Refund request ID is UUID",
      typeof returnShipment.refundRequest.id === "string" &&
        returnShipment.refundRequest.id.length > 0,
    );
  }

  // Related customer info should match authenticated customer summary if present
  if (returnShipment.customer !== undefined) {
    typia.assert(returnShipment.customer);
    TestValidator.equals(
      "Customer ID in return shipment matches",
      returnShipment.customer.id,
      customer.id,
    );
  }
}
