import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";

export async function test_api_customer_update_by_id(
  connection: api.IConnection,
) {
  // 1. Register a new customer using auth.customer.join
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "StrongPassword123!",
  } satisfies IShoppingMallCustomer.IJoin;

  const customer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, { body: joinBody });
  typia.assert(customer);

  // 2. Update mutable fields: nickname and phone_number
  const updateBody = {
    nickname: RandomGenerator.name(),
    phone_number: RandomGenerator.mobile(),
    status: customer.status, // status must be provided and preserved
  } satisfies IShoppingMallCustomer.IUpdate;

  const updatedCustomer: IShoppingMallCustomer =
    await api.functional.shoppingMall.customer.customers.update(connection, {
      id: customer.id,
      body: updateBody,
    });
  typia.assert(updatedCustomer);

  // 3. Validate updated fields are changed correctly
  TestValidator.equals(
    "nickname should be updated",
    updatedCustomer.nickname,
    updateBody.nickname,
  );
  TestValidator.equals(
    "phone_number should be updated",
    updatedCustomer.phone_number,
    updateBody.phone_number,
  );
  TestValidator.equals(
    "email should NOT change",
    updatedCustomer.email,
    customer.email,
  );
  TestValidator.equals(
    "status should NOT change",
    updatedCustomer.status,
    customer.status,
  );

  // 4. Attempt unauthorized update - simulate with an unauthenticated connection
  const unauthConnection: api.IConnection = { ...connection, headers: {} };
  // Try to update nickname unauthorized, expected to fail
  await TestValidator.error("unauthorized update should fail", async () => {
    await api.functional.shoppingMall.customer.customers.update(
      unauthConnection,
      {
        id: customer.id,
        body: {
          nickname: RandomGenerator.name(),
          phone_number: RandomGenerator.mobile(),
          status: customer.status,
        } satisfies IShoppingMallCustomer.IUpdate,
      },
    );
  });
}
