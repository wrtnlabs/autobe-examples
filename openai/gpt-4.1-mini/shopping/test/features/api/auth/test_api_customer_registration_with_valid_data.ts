import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";

export async function test_api_customer_registration_with_valid_data(
  connection: api.IConnection,
) {
  // 1. Generate a valid unique email and password
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(16); // Strong alphanumeric password

  // 2. Call the join API endpoint to register the customer
  const authorizedCustomer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: {
        email,
        password,
      } satisfies IShoppingMallCustomer.IJoin,
    });
  typia.assert(authorizedCustomer);

  // 3. Validate response fields
  TestValidator.predicate(
    "authorized customer id is not empty",
    authorizedCustomer.id.length > 0,
  );
  TestValidator.equals(
    "email matches registration input",
    authorizedCustomer.email,
    email,
  );

  TestValidator.predicate(
    "password_hash present and non-empty",
    authorizedCustomer.password_hash.length > 0,
  );

  TestValidator.predicate(
    "token access token present",
    typeof authorizedCustomer.token.access === "string" &&
      authorizedCustomer.token.access.length > 0,
  );
  TestValidator.predicate(
    "token refresh token present",
    typeof authorizedCustomer.token.refresh === "string" &&
      authorizedCustomer.token.refresh.length > 0,
  );

  TestValidator.predicate(
    "token expired_at is valid date-time string",
    typeof authorizedCustomer.token.expired_at === "string" &&
      !Number.isNaN(Date.parse(authorizedCustomer.token.expired_at)),
  );
  TestValidator.predicate(
    "token refreshable_until is valid date-time string",
    typeof authorizedCustomer.token.refreshable_until === "string" &&
      !Number.isNaN(Date.parse(authorizedCustomer.token.refreshable_until)),
  );

  // 4. Business logic assurance - optional consistency
  TestValidator.predicate(
    "account status string present",
    typeof authorizedCustomer.status === "string" &&
      authorizedCustomer.status.length > 0,
  );
  TestValidator.predicate(
    "created_at is valid date-time string",
    typeof authorizedCustomer.created_at === "string" &&
      !Number.isNaN(Date.parse(authorizedCustomer.created_at)),
  );
  TestValidator.predicate(
    "updated_at is valid date-time string",
    typeof authorizedCustomer.updated_at === "string" &&
      !Number.isNaN(Date.parse(authorizedCustomer.updated_at)),
  );

  // Ensure deleted_at can be null or undefined or valid date string
  if (
    authorizedCustomer.deleted_at !== null &&
    authorizedCustomer.deleted_at !== undefined
  ) {
    TestValidator.predicate(
      "deleted_at is valid date-time string",
      !Number.isNaN(Date.parse(authorizedCustomer.deleted_at)),
    );
  }
}
