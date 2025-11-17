import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";

export async function test_api_shopping_mall_customer_deletion_by_customer(
  connection: api.IConnection,
) {
  // 1. Authenticate as new customer via /auth/customer/join
  const newCustomerEmail = `${RandomGenerator.alphabets(8)}@example.com`;
  const newCustomerPassword = "TestPassword123!";

  const authCustomer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: {
        email: newCustomerEmail,
        password: newCustomerPassword,
        href: "https://example.com/signup",
        referrer: "https://example.com/home",
      } satisfies IShoppingMallCustomer.ICreate,
    });
  typia.assert(authCustomer);

  // 2. Create a shopping mall customer record
  const shoppingMallCustomer: IShoppingMallCustomer =
    await api.functional.shoppingMall.customer.shoppingMallCustomers.create(
      connection,
      {
        body: {
          email: newCustomerEmail,
          password: newCustomerPassword,
          href: "https://example.com/signup",
          referrer: "https://example.com/home",
        } satisfies IShoppingMallCustomer.ICreate,
      },
    );
  typia.assert(shoppingMallCustomer);

  // 3. Delete the created shopping mall customer
  await api.functional.shoppingMall.customer.shoppingMallCustomers.erase(
    connection,
    {
      shoppingMallCustomerId: shoppingMallCustomer.id,
    },
  );

  // Test validation of deletion by further trying to delete again should error
  await TestValidator.error(
    "cannot delete a non-existing shopping mall customer",
    async () => {
      await api.functional.shoppingMall.customer.shoppingMallCustomers.erase(
        connection,
        {
          shoppingMallCustomerId: shoppingMallCustomer.id,
        },
      );
    },
  );
}
