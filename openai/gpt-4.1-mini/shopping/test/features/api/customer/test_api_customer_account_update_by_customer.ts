import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";

export async function test_api_customer_account_update_by_customer(
  connection: api.IConnection,
) {
  // 1. Sign up and authenticate as a new customer using join API
  const customerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "securePassword123",
  } satisfies IShoppingMallCustomer.IJoin;

  const authCustomer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinBody,
    });
  typia.assert(authCustomer);

  // 2. Create the customer account using create API
  const customerCreateBody = {
    email: authCustomer.email,
    password_hash: authCustomer.password_hash,
    nickname: RandomGenerator.name(),
    phone_number: RandomGenerator.mobile(),
    status: "active",
  } satisfies IShoppingMallCustomer.ICreate;

  const createdCustomer: IShoppingMallCustomer =
    await api.functional.shoppingMall.customers.create(connection, {
      body: customerCreateBody,
    });
  typia.assert(createdCustomer);
  TestValidator.equals(
    "created customer email matches",
    createdCustomer.email,
    customerCreateBody.email,
  );

  // 3. Update the customer account by ID using update API
  const updateBody = {
    nickname: RandomGenerator.name(),
    phone_number: RandomGenerator.mobile(),
    status: "active",
  } satisfies IShoppingMallCustomer.IUpdate;

  const updatedCustomer: IShoppingMallCustomer =
    await api.functional.shoppingMall.customer.customers.update(connection, {
      id: createdCustomer.id,
      body: updateBody,
    });
  typia.assert(updatedCustomer);

  // 4. Validate update is reflected
  TestValidator.equals(
    "updated nickname is correct",
    updatedCustomer.nickname,
    updateBody.nickname,
  );
  TestValidator.equals(
    "updated phone number is correct",
    updatedCustomer.phone_number,
    updateBody.phone_number,
  );
  TestValidator.equals(
    "updated status is correct",
    updatedCustomer.status,
    updateBody.status,
  );
  TestValidator.equals(
    "email remains unchanged",
    updatedCustomer.email,
    createdCustomer.email,
  );
}
