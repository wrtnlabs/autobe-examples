import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallMileage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMileage";

export async function test_api_customer_mileage_creation_by_authenticated_customer(
  connection: api.IConnection,
) {
  // 1. Register a new customer via join authentication.
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    href: "http://localhost/login",
    referrer: "http://localhost/",
  } satisfies IShoppingMallCustomer.ICreate;

  const authorized: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, { body: joinBody });
  typia.assert(authorized);

  // 2. Create a new mileage record with valid points and optional expiration.
  const createBody: IShoppingMallMileage.ICreate = {
    points: RandomGenerator.pick([1, 5, 10, 20, 50, 100]) satisfies number,
    expiration_date:
      Math.random() > 0.5
        ? new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString()
        : null,
  } satisfies IShoppingMallMileage.ICreate;

  const mileage: IShoppingMallMileage =
    await api.functional.shoppingMall.customer.mileages.create(connection, {
      body: createBody,
    });
  typia.assert(mileage);

  // 3. Validate customer association and points correctness
  TestValidator.equals(
    "mileage.shopping_mall_customer_id matches authorized.customer.id",
    mileage.shopping_mall_customer_id,
    authorized.id,
  );
  TestValidator.predicate(
    "mileage.points is positive integer",
    Number.isInteger(mileage.points) && mileage.points > 0,
  );
  // expiration_date can be null or string in ISO format, typia.assert() validates format
  TestValidator.predicate(
    "mileage.expiration_date is null or valid ISO date string",
    mileage.expiration_date === null ||
      typeof mileage.expiration_date === "string",
  );
}
