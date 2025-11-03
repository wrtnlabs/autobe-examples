import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";

export async function test_api_customer_update_profile_by_customer(
  connection: api.IConnection,
) {
  // 1. Join customer to authenticate and obtain customer id and token
  const createBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(10),
    nickname: RandomGenerator.name(),
  } satisfies IShoppingMallCustomer.ICreate;

  const authorizedCustomer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: createBody,
    });
  typia.assert(authorizedCustomer);

  // 2. Prepare update data with new email and nickname
  const updateBody = {
    email: typia.random<string & tags.Format<"email">>(),
    nickname: RandomGenerator.name(),
  } satisfies IShoppingMallCustomer.IUpdate;

  // 3. Call updateCustomer endpoint with authenticated connection
  const updatedCustomer: IShoppingMallCustomer =
    await api.functional.shoppingMall.customer.customers.updateCustomer(
      connection,
      {
        id: authorizedCustomer.id,
        body: updateBody,
      },
    );
  typia.assert(updatedCustomer);

  // 4. Validate the updated fields are exactly as sent
  TestValidator.equals(
    "customer email updated",
    updatedCustomer.email,
    updateBody.email,
  );
  TestValidator.equals(
    "customer nickname updated",
    updatedCustomer.nickname,
    updateBody.nickname,
  );

  // 5. Validate other required fields
  TestValidator.predicate(
    "customer id is uuid",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      updatedCustomer.id,
    ),
  );

  TestValidator.predicate(
    "created_at is date-time",
    typeof updatedCustomer.created_at === "string" &&
      updatedCustomer.created_at.length > 0,
  );

  TestValidator.predicate(
    "updated_at is date-time",
    typeof updatedCustomer.updated_at === "string" &&
      updatedCustomer.updated_at.length > 0,
  );

  TestValidator.predicate(
    "deleted_at is null or undefined",
    updatedCustomer.deleted_at === null ||
      updatedCustomer.deleted_at === undefined,
  );
}
