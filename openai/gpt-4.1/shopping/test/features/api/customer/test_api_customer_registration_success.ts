import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";

/**
 * Validates the successful registration of a new shopping mall customer.
 *
 * This test ensures that a customer can be registered with a unique email, a
 * password meeting complexity requirements (minimum 8 characters, containing
 * uppercase, lowercase, digit, and symbol), a valid legal full name, and a
 * properly formatted phone number. It confirms that the API creates a new
 * customer account, returns an authorized actor with correct information, and
 * provides valid JWT authentication tokens as part of the authorized session
 * payload.
 *
 * Steps:
 *
 * 1. Generate unique, valid registration data: email, password, name, phone
 * 2. Call the /auth/customer/join endpoint to register a customer
 * 3. Validate that the response is a properly typed authorized customer
 * 4. Confirm returned fields match input and basic post-join invariants;
 *
 *    - The returned JWT token property is present and has both access and refresh
 *         tokens
 *    - Email, name, and phone match
 *    - Email verification is initially false
 *    - Account creation and update timestamps are valid ISO-8601 datetimes
 */
export async function test_api_customer_registration_success(
  connection: api.IConnection,
) {
  // Step 1: Generate registration input with required complexity
  const email = `${RandomGenerator.alphaNumeric(10)}@example.com` as string &
    tags.Format<"email">;
  // Compose a strong password: at least 8 chars, uppercase, lowercase, digit, symbol
  const password = [
    RandomGenerator.pick([..."ABCDEFGHIJKLMNOPQRSTUVWXYZ"]),
    RandomGenerator.pick([..."abcdefghijklmnopqrstuvwxyz"]),
    RandomGenerator.pick([..."0123456789"]),
    RandomGenerator.pick([..."!@#$%^&*()_+-=[]{};:,.<>?"]),
    RandomGenerator.alphaNumeric(4), // ensure min length
  ].join("");
  const name = RandomGenerator.paragraph({
    sentences: 2,
    wordMin: 2,
    wordMax: 8,
  }); // Legal full name >=2 chars
  // starts with +82, 010, etc. - generate a valid phone string of 10+ chars
  const phone = RandomGenerator.mobile();

  const requestBody = {
    email,
    password: password as string & tags.MinLength<8> & tags.Format<"password">,
    name: name as string & tags.MinLength<2> & tags.MaxLength<64>,
    phone,
  } satisfies IShoppingMallCustomer.ICreate;

  // Step 2: Call customer join API
  const authorizedCustomer = await api.functional.auth.customer.join(
    connection,
    {
      body: requestBody,
    },
  );
  typia.assert(authorizedCustomer);

  // Step 3: Validate the customer registration response matches input
  TestValidator.equals(
    "registered email matches input",
    authorizedCustomer.email,
    email,
  );
  TestValidator.equals(
    "registered name matches input",
    authorizedCustomer.name,
    name,
  );
  TestValidator.equals(
    "registered phone matches input",
    authorizedCustomer.phone,
    phone,
  );
  TestValidator.equals(
    "email is not verified after registration",
    authorizedCustomer.is_email_verified,
    false,
  );

  // Step 4: Basic JWT structure in token property
  typia.assert<IAuthorizationToken>(authorizedCustomer.token);
  TestValidator.predicate(
    "access token present",
    typeof authorizedCustomer.token.access === "string" &&
      authorizedCustomer.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token present",
    typeof authorizedCustomer.token.refresh === "string" &&
      authorizedCustomer.token.refresh.length > 0,
  );

  // Step 5: Confirm id format (UUID) and date-time fields
  typia.assert<string & tags.Format<"uuid">>(authorizedCustomer.id);
  typia.assert<string & tags.Format<"date-time">>(
    authorizedCustomer.created_at,
  );
  typia.assert<string & tags.Format<"date-time">>(
    authorizedCustomer.updated_at,
  );
}
