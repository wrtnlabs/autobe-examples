import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";

export async function test_api_customer_join_successful_registration(
  connection: api.IConnection,
) {
  // Generate a unique email for the new customer
  const email = typia.random<string & tags.Format<"email">>();
  // Prepare the request body with required customer information
  const requestBody = {
    email: email,
    password: "StrongPassword123!", // secure plain text password for testing
    full_name: RandomGenerator.name(),
    href: "https://example.com/signup",
    referrer: "https://example.com/home",
  } satisfies IShoppingMallCustomer.ICreate;

  // Call the join API to register the new customer
  const authorizedCustomer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: requestBody,
    });

  // Assert the response type is valid and data is consistent
  typia.assert(authorizedCustomer);

  // Basic validation of returned fields
  TestValidator.predicate(
    "ID is a UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      authorizedCustomer.id,
    ),
  );
  TestValidator.equals(
    "Email matches request",
    authorizedCustomer.email,
    email,
  );
  TestValidator.predicate(
    "Name is non empty",
    authorizedCustomer.name.length > 0,
  );

  // Token validation
  TestValidator.predicate(
    "Access token is a non-empty string",
    typeof authorizedCustomer.token.access === "string" &&
      authorizedCustomer.token.access.length > 0,
  );
  TestValidator.predicate(
    "Refresh token is a non-empty string",
    typeof authorizedCustomer.token.refresh === "string" &&
      authorizedCustomer.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "Token expiry is valid date string",
    !isNaN(Date.parse(authorizedCustomer.token.expired_at)),
  );
  TestValidator.predicate(
    "Refreshable until is a valid date string",
    !isNaN(Date.parse(authorizedCustomer.token.refreshable_until)),
  );
}
