import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";

export async function test_api_shopping_mall_admin_customer_deletion(
  connection: api.IConnection,
) {
  // 1. Register a new admin user
  const adminCreateBody = {
    email: `admin_${RandomGenerator.alphaNumeric(8)}@example.com`,
    name: RandomGenerator.name(),
    password: "SecurePass123!",
    phone_number: null,
    role: "admin",
  } satisfies IShoppingMallAdmin.ICreate;
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: adminCreateBody });
  typia.assert(admin);

  // 2. Create a new customer
  const customerCreateBody = {
    email: `customer_${RandomGenerator.alphaNumeric(8)}@example.com`,
    password: "CustomerPass123!",
    full_name: RandomGenerator.name(),
    ip: null,
    href: "http://example.com/signup",
    referrer: "http://example.com/",
  } satisfies IShoppingMallCustomer.ICreate;
  const customer: IShoppingMallCustomer =
    await api.functional.shoppingMall.customers.create(connection, {
      body: customerCreateBody,
    });
  typia.assert(customer);

  // 3. Delete the customer by admin
  await api.functional.shoppingMall.admin.customers.erase(connection, {
    customerId: customer.id,
  });
}
