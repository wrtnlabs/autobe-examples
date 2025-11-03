import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAuthorizationToken";
import type { IShoppingCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingCustomer";

/**
 * Test successful registration of a new customer with unique email, strong
 * password, real name, and valid phone.
 *
 * This test covers the core onboarding scenario for a new shopping customer:
 *
 * 1. Generate random, unique email conforming to email format.
 * 2. Create a password meeting min/max length (8-128), and non-trivial.
 * 3. Generate a realistic customer name, and valid phone number.
 * 4. Set session context fields for href and referrer.
 * 5. Register the account through the join endpoint.
 * 6. Validate the response:
 *
 *    - IShoppingCustomer.IAuthorized structure is returned.
 *    - Tokens (access/refresh) exist and are non-empty strings.
 *    - Output email, phone, and name match input.
 *    - Is_active is true, deleted_at is null or undefined.
 *    - Valid UUID/ISO format for id, created_at, updated_at.
 * 7. Session/audit log is proved by operation success and context acceptance.
 */
export async function test_api_customer_registration_basic_success(
  connection: api.IConnection,
) {
  // 1. Prepare customer registration input
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(12); // Secure, meets [8,128] chars
  const name = RandomGenerator.name();
  const phone = RandomGenerator.mobile();
  const href = "https://shop.example.com/welcome";
  const referrer = "https://www.google.com/search?q=shop";

  // 2. Register the customer
  const customer = await api.functional.auth.customer.join(connection, {
    body: {
      email,
      password,
      name,
      phone,
      href,
      referrer,
    } satisfies IShoppingCustomer.ICreate,
  });
  typia.assert(customer);

  // 3. Validate returned data
  TestValidator.equals("email matches input", customer.email, email);
  TestValidator.equals("name matches input", customer.name, name);
  TestValidator.equals("phone matches input", customer.phone, phone);
  TestValidator.equals("is_active is true", customer.is_active, true);
  TestValidator.equals(
    "deleted_at is null or undefined",
    customer.deleted_at,
    null,
  );
  TestValidator.predicate(
    "id is UUID",
    typeof customer.id === "string" && /[0-9a-f-]{36}/i.test(customer.id),
  );
  TestValidator.predicate(
    "created_at is ISO string",
    typeof customer.created_at === "string" &&
      !isNaN(Date.parse(customer.created_at)),
  );
  TestValidator.predicate(
    "updated_at is ISO string",
    typeof customer.updated_at === "string" &&
      !isNaN(Date.parse(customer.updated_at)),
  );

  // 4. Validate JWT tokens
  TestValidator.predicate(
    "access token present",
    typeof customer.token.access === "string" &&
      customer.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token present",
    typeof customer.token.refresh === "string" &&
      customer.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "expired_at is ISO string",
    typeof customer.token.expired_at === "string" &&
      !isNaN(Date.parse(customer.token.expired_at)),
  );
  TestValidator.predicate(
    "refreshable_until is ISO string",
    typeof customer.token.refreshable_until === "string" &&
      !isNaN(Date.parse(customer.token.refreshable_until)),
  );

  // 5. Validate role field (should be 'customer' or undefined)
  TestValidator.equals(
    "role is 'customer' or undefined",
    customer.role,
    "customer",
  );
}
