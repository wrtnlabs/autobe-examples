import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";

export async function test_api_shopping_mall_customer_creation(
  connection: api.IConnection,
) {
  // 1. Prepare customer creation request body with valid email, password, full name, and audit fields
  const createBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    full_name: RandomGenerator.name(),
    ip: null, // explicitly null as optional
    href: "https://shoppingmall.example.com/signup",
    referrer: "https://shoppingmall.example.com/landing",
  } satisfies IShoppingMallCustomer.ICreate;

  // 2. Call the customer create API endpoint
  const customer: IShoppingMallCustomer =
    await api.functional.shoppingMall.customers.create(connection, {
      body: createBody,
    });

  // 3. Assert returned customer data is valid and matches the request
  typia.assert(customer);

  TestValidator.predicate(
    "customer id should be non-empty string",
    typeof customer.id === "string" && customer.id.length > 0,
  );
  TestValidator.equals(
    "customer email matches request",
    customer.email,
    createBody.email,
  );
  TestValidator.equals(
    "customer full_name matches request",
    customer.full_name,
    createBody.full_name,
  );

  // 4. Validate created_at and updated_at are valid ISO date-time strings
  TestValidator.predicate(
    "created_at is valid ISO date-time format",
    typeof customer.created_at === "string" && customer.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at is valid ISO date-time format",
    typeof customer.updated_at === "string" && customer.updated_at.length > 0,
  );

  // 5. deleted_at is either null, undefined or valid ISO date-time string
  TestValidator.predicate(
    "deleted_at is null or undefined or string",
    customer.deleted_at === null ||
      customer.deleted_at === undefined ||
      (typeof customer.deleted_at === "string" &&
        customer.deleted_at.length > 0),
  );
}
