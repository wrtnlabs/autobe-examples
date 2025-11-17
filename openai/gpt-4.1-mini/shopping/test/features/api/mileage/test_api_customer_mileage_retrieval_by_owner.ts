import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallMileage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMileage";

export async function test_api_customer_mileage_retrieval_by_owner(
  connection: api.IConnection,
) {
  // 1. Authenticate as a new customer to establish authorization
  const email = typia.random<string & tags.Format<"email">>();
  const customer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: {
        email: email,
        password: "password123",
        href: "https://example.com/signup",
        referrer: "https://example.com",
      } satisfies IShoppingMallCustomer.ICreate,
    });
  typia.assert(customer);

  // 2. Create a mileage record for the authenticated customer
  const createBody = {
    points: RandomGenerator.pick([10, 20, 50, 100, 200] as const),
    expiration_date: null,
  } satisfies IShoppingMallMileage.ICreate;
  const mileage: IShoppingMallMileage =
    await api.functional.shoppingMall.customer.mileages.create(connection, {
      body: createBody,
    });
  typia.assert(mileage);
  TestValidator.equals(
    "mileage shopping_mall_customer_id matches customer id",
    mileage.shopping_mall_customer_id,
    customer.id,
  );

  // 3. Retrieve the mileage record by mileageId as the same customer
  const retrieved: IShoppingMallMileage =
    await api.functional.shoppingMall.customer.mileages.at(connection, {
      mileageId: mileage.id,
    });
  typia.assert(retrieved);
  // Validate the retrieved data matches created one
  TestValidator.equals(
    "retrieved mileage id matches created id",
    retrieved.id,
    mileage.id,
  );
  TestValidator.equals(
    "retrieved points match",
    retrieved.points,
    createBody.points,
  );
  TestValidator.equals(
    "retrieved shopping_mall_customer_id matches",
    retrieved.shopping_mall_customer_id,
    customer.id,
  );
  TestValidator.equals(
    "retrieved expiration_date is null",
    retrieved.expiration_date,
    null,
  );

  // 4. Authenticate as a different new customer
  const otherEmail = typia.random<string & tags.Format<"email">>();
  const otherCustomer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: {
        email: otherEmail,
        password: "password123",
        href: "https://example.com/signup",
        referrer: "https://example.com",
      } satisfies IShoppingMallCustomer.ICreate,
    });
  typia.assert(otherCustomer);

  // 5. Attempt to retrieve the mileage record created by the first customer while authenticated as the other customer
  // Expect an error due to access control
  await TestValidator.error(
    "should fail retrieval by different customer",
    async () => {
      await api.functional.shoppingMall.customer.mileages.at(connection, {
        mileageId: mileage.id,
      });
    },
  );

  // Note: No additional tokens or headers are set manually; SDK handles auth context internally.
}
