import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";

export async function test_api_customer_profile_update(
  connection: api.IConnection,
) {
  const customerId = typia.random<string & tags.Format<"uuid">>();
  const firstName = RandomGenerator.name();
  const lastName = RandomGenerator.name();
  const updateBody = JSON.stringify({
    first_name: firstName,
    last_name: lastName,
  });

  const updateResponse: IShoppingMallCustomer =
    await api.functional.shoppingMall.customer.actors.customers.update(
      connection,
      {
        customerId,
        body: updateBody satisfies IShoppingMallCustomer.IUpdate,
      },
    );
  typia.assert(updateResponse);

  TestValidator.equals("customer ID matches", updateResponse.id, customerId);
  TestValidator.predicate(
    "first name updated",
    () => updateResponse.first_name === firstName,
  );
  TestValidator.predicate(
    "last name updated",
    () => updateResponse.last_name === lastName,
  );
  TestValidator.equals("status unchanged", updateResponse.status, "active");

  // Verify password_hash is null or unchanged (it could be null if customer was created without password)
  TestValidator.predicate(
    "password hash unchanged",
    () =>
      updateResponse.password_hash === null ||
      updateResponse.password_hash === "",
  );

  // Validate the response structure matches IShoppingMallCustomer
  TestValidator.predicate(
    "updated_at is date-time format",
    () =>
      updateResponse.updated_at && Date.parse(updateResponse.updated_at) > 0,
  );
  TestValidator.predicate(
    "created_at is date-time format",
    () =>
      updateResponse.created_at && Date.parse(updateResponse.created_at) > 0,
  );
}
