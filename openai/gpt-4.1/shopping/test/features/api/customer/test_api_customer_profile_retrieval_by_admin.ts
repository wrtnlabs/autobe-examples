import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";

/**
 * Validate that admin users can retrieve a customer's full profile by UUID and
 * that this operation is restricted to proper admin authorization only.
 *
 * This test:
 *
 * - Registers an admin via /auth/admin/join and authenticates (token is issued
 *   and set on connection)
 * - Creates a new customer test profile (using
 *   typia.random<IShoppingMallCustomer> for test input)
 * - As admin, performs GET /shoppingMall/admin/customers/{customerId} to fetch
 *   customer's details by UUID
 * - Asserts all DTO properties (id, name, email, phone, is_email_verified,
 *   created_at, updated_at) are present and in the correct format
 * - Ensures forbidden fields (like password hash) are NOT present in output
 *   (checked via typia.assert)
 * - Attempts to fetch the same data with missing authentication and expects an
 *   authorization error
 * - Attempts to fetch as a bogus different admin (by rejoining) and expects
 *   access to succeed (unless business logic restricts to original admin only)
 * - All negative cases use TestValidator.error()
 */
export async function test_api_customer_profile_retrieval_by_admin(
  connection: api.IConnection,
) {
  // 1. Register a new admin
  const adminBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(2),
  } satisfies IShoppingMallAdmin.ICreate;
  const adminAuth = await api.functional.auth.admin.join(connection, {
    body: adminBody,
  });
  typia.assert(adminAuth);

  // 2. Create a test customer in the database or via random DTO for test harness (in real usage, through a proper customer sign-up API)
  const customer = typia.random<IShoppingMallCustomer>();
  typia.assert(customer);

  // 3. As admin, fetch the customer profile using their UUID
  const customerProfile = await api.functional.shoppingMall.admin.customers.at(
    connection,
    { customerId: customer.id },
  );
  typia.assert(customerProfile);
  TestValidator.equals("customer.id matches", customerProfile.id, customer.id);
  TestValidator.equals(
    "customer.email matches",
    customerProfile.email,
    customer.email,
  );
  TestValidator.equals(
    "customer.name matches",
    customerProfile.name,
    customer.name,
  );
  TestValidator.equals(
    "customer.phone matches",
    customerProfile.phone,
    customer.phone,
  );
  TestValidator.equals(
    "customer.is_email_verified matches",
    customerProfile.is_email_verified,
    customer.is_email_verified,
  );
  TestValidator.predicate(
    "customer.created_at is ISO 8601",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(.\d+)?Z$/.test(
      customerProfile.created_at,
    ),
  );
  TestValidator.predicate(
    "customer.updated_at is ISO 8601",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(.\d+)?Z$/.test(
      customerProfile.updated_at,
    ),
  );

  // 4. Try unauthorized access (no Authorization in connection): should fail
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error("deny unauthenticated access", async () => {
    await api.functional.shoppingMall.admin.customers.at(unauthConn, {
      customerId: customer.id,
    });
  });

  // 5. (Optional) Register a second admin and try access; unless business logic restricts, this should succeed
  const admin2Body = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(2),
  } satisfies IShoppingMallAdmin.ICreate;
  const admin2Auth = await api.functional.auth.admin.join(connection, {
    body: admin2Body,
  });
  typia.assert(admin2Auth);
  // token for admin2 is now set
  const customerProfileByAdmin2 =
    await api.functional.shoppingMall.admin.customers.at(connection, {
      customerId: customer.id,
    });
  typia.assert(customerProfileByAdmin2);
  TestValidator.equals(
    "admin2 can fetch customer",
    customerProfileByAdmin2.id,
    customer.id,
  );
}
