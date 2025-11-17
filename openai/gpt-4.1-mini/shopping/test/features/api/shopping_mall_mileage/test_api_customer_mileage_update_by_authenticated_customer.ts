import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallMileage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMileage";

/**
 * Test the update of an existing customer mileage record by an authenticated
 * customer.
 *
 * This scenario verifies that an authenticated customer can successfully update
 * their mileage record, including points and expiration date. The test covers
 * the full flow from customer registration, mileage creation, to update
 * operation, ensuring proper authorization and data integrity.
 *
 * Steps:
 *
 * 1. Register (join) a new customer to obtain authenticated context.
 * 2. Create an initial mileage record for the authenticated customer.
 * 3. Update the created mileage record with new points and expiration date.
 * 4. Validate the API responses and confirm updated values match expectations.
 *
 * All API responses are validated with typia.assert. Await is used for all
 * async calls. The SDK internally manages authentication tokens; no manual
 * header handling is needed.
 */
export async function test_api_customer_mileage_update_by_authenticated_customer(
  connection: api.IConnection,
) {
  // 1. Register and authenticate as a customer
  const customerCreate = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(10),
    href: "https://example.com/signup",
    referrer: "https://referrer.com",
  } satisfies IShoppingMallCustomer.ICreate;

  const authorizedCustomer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerCreate,
    });
  typia.assert(authorizedCustomer);

  // 2. Create a mileage record for the authenticated customer
  const mileageCreate = {
    points: RandomGenerator.alphaNumeric(3).length * 10 || 100,
    expiration_date: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString(), // 7 days from now
  } satisfies IShoppingMallMileage.ICreate;

  const mileage: IShoppingMallMileage =
    await api.functional.shoppingMall.customer.mileages.create(connection, {
      body: mileageCreate,
    });
  typia.assert(mileage);

  // 3. Update the mileage record with new points and expiration_date
  const updatePoints = mileage.points + 50;
  const updateExpiration = new Date(
    Date.now() + 30 * 24 * 3600 * 1000,
  ).toISOString(); // 30 days from now

  const mileageUpdateBody = {
    points: updatePoints,
    expiration_date: updateExpiration,
  } satisfies IShoppingMallMileage.IUpdate;

  const updatedMileage: IShoppingMallMileage =
    await api.functional.shoppingMall.customer.mileages.update(connection, {
      mileageId: mileage.id,
      body: mileageUpdateBody,
    });
  typia.assert(updatedMileage);

  // 4. Assert all responses and updated data correctness
  TestValidator.equals(
    "updated mileage id equals created mileage id",
    updatedMileage.id,
    mileage.id,
  );
  TestValidator.equals(
    "updated mileage points are correct",
    updatedMileage.points,
    updatePoints,
  );
  TestValidator.equals(
    "updated mileage expiration_date is correct",
    updatedMileage.expiration_date,
    updateExpiration,
  );
}
