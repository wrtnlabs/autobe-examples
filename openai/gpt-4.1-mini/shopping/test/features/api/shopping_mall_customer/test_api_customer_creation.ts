import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";

export async function test_api_customer_creation(connection: api.IConnection) {
  // Generate realistic customer sign-up data
  const email =
    `user_${RandomGenerator.alphaNumeric(8)}@example.com` satisfies string &
      tags.Format<"email">;
  const password = RandomGenerator.alphaNumeric(12);
  const fullName = RandomGenerator.name(2);
  const href = "https://shoppingmall.example/signup";
  const referrer = "https://shoppingmall.example";

  // Prepare request body according to IShoppingMallCustomer.ICreate
  const requestBody = {
    email: email,
    password: password,
    full_name: fullName,
    ip: null, // IP optional, explicitly null
    href: href,
    referrer: referrer,
  } satisfies IShoppingMallCustomer.ICreate;

  // Call the customer creation API
  const customer: IShoppingMallCustomer =
    await api.functional.shoppingMall.customers.create(connection, {
      body: requestBody,
    });

  // Validate API response type correctness
  typia.assert(customer);

  // Business logic validation for returned data
  TestValidator.predicate(
    "created customer has valid uuid",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      customer.id,
    ),
  );
  TestValidator.equals("email matches requested", customer.email, email);
  TestValidator.equals(
    "full_name matches requested",
    customer.full_name,
    fullName,
  );
  TestValidator.predicate(
    "created_at is valid date-time",
    typeof customer.created_at === "string",
  );
  TestValidator.predicate(
    "updated_at is valid date-time",
    typeof customer.updated_at === "string",
  );

  // Validate deleted_at if present
  if (customer.deleted_at !== null && customer.deleted_at !== undefined) {
    TestValidator.predicate(
      "deleted_at is valid date-time",
      typeof customer.deleted_at === "string",
    );
  }
}
