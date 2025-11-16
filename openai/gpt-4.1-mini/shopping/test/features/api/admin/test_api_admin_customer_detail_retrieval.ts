import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";

export async function test_api_admin_customer_detail_retrieval(
  connection: api.IConnection,
) {
  // 1. Admin joins (registers) and receives authorization token
  const email = typia.random<string & tags.Format<"email">>();
  const adminCreate = {
    email,
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(8),
    phone_number: null,
    role: "admin",
  } satisfies IShoppingMallAdmin.ICreate;
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminCreate,
    });
  typia.assert(admin);
  TestValidator.equals("admin email matches input", admin.email, email);
  TestValidator.equals("admin role is 'admin'", admin.role, "admin");

  // 2. Create a new customer record
  const customerCreate = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(8),
    full_name: RandomGenerator.name(),
    ip: null,
    href: "https://example.com/signup",
    referrer: "https://google.com",
  } satisfies IShoppingMallCustomer.ICreate;
  const customer: IShoppingMallCustomer =
    await api.functional.shoppingMall.customers.create(connection, {
      body: customerCreate,
    });
  typia.assert(customer);
  TestValidator.equals(
    "customer email matches input",
    customer.email,
    customerCreate.email,
  );
  TestValidator.equals(
    "customer full_name matches input",
    customer.full_name,
    customerCreate.full_name,
  );

  // 3. Admin retrieves customer detail by customerId
  const retrievedCustomer: IShoppingMallCustomer =
    await api.functional.shoppingMall.admin.customers.at(connection, {
      customerId: customer.id,
    });
  typia.assert(retrievedCustomer);

  // Validate that retrieved customer data matches created data
  TestValidator.equals(
    "retrieved customer id matches",
    retrievedCustomer.id,
    customer.id,
  );
  TestValidator.equals(
    "retrieved customer email matches",
    retrievedCustomer.email,
    customer.email,
  );
  TestValidator.equals(
    "retrieved customer full_name matches",
    retrievedCustomer.full_name,
    customer.full_name,
  );
  TestValidator.equals(
    "retrieved customer created_at exists",
    typeof retrievedCustomer.created_at === "string",
    true,
  );
  TestValidator.equals(
    "retrieved customer updated_at exists",
    typeof retrievedCustomer.updated_at === "string",
    true,
  );
  TestValidator.equals(
    "retrieved customer deleted_at is null or undefined",
    retrievedCustomer.deleted_at,
    null,
  );
}
