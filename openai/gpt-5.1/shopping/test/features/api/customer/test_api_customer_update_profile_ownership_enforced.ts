import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerJoin";

export async function test_api_customer_update_profile_ownership_enforced(
  connection: api.IConnection,
) {
  // 1. Register Customer A on its dedicated connection
  const customerAConn: api.IConnection = { ...connection };

  const customerAJoinBody = typia.random<IShoppingMallCustomerJoin.IRequest>();
  const customerAAuth: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(customerAConn, {
      body: customerAJoinBody,
    });
  typia.assert(customerAAuth);

  const customerAId = customerAAuth.id;

  // 2. Register Customer B on a separate connection to get a distinct principal
  const customerBConn: api.IConnection = { ...connection };

  const customerBJoinBody = typia.random<IShoppingMallCustomerJoin.IRequest>();
  const customerBAuth: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(customerBConn, {
      body: customerBJoinBody,
    });
  typia.assert(customerBAuth);

  const customerBId = customerBAuth.id;

  // Ensure that A and B are different customers
  TestValidator.predicate(
    "customer A and B must be different",
    () => customerAId !== customerBId,
  );

  // 3. Prepare a valid update payload that would be acceptable for any customer
  const unauthorizedUpdateBody = typia.random<IShoppingMallCustomer.IUpdate>();

  // 4. Using Customer B's token, attempt to update Customer A's profile and expect an error
  await TestValidator.error(
    "customer B must not update customer A",
    async () => {
      await api.functional.shoppingMall.customer.customers.update(
        customerBConn,
        {
          customerId: customerAId,
          body: unauthorizedUpdateBody,
        },
      );
    },
  );

  // 5. Perform a legitimate self-update with Customer A's token
  const selfUpdateBody = typia.random<IShoppingMallCustomer.IUpdate>();

  const selfUpdatedCustomer: IShoppingMallCustomer =
    await api.functional.shoppingMall.customer.customers.update(customerAConn, {
      customerId: customerAId,
      body: selfUpdateBody,
    });
  typia.assert(selfUpdatedCustomer);

  // 6. Validate that the self-update applied to the correct customer record
  TestValidator.equals(
    "self-updated customer id must equal customer A id",
    selfUpdatedCustomer.id,
    customerAId,
  );
}
