import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";

export async function test_api_customer_token_refresh(
  connection: api.IConnection,
) {
  // Step 1: Create a new customer account with realistic data
  const customerCreateBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12), // random 12 char string
    full_name: RandomGenerator.name(),
    ip: null,
    href: "https://example.com/signup",
    referrer: "https://example.com/landing",
  } satisfies IShoppingMallCustomer.ICreate;

  const authorizedCustomer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerCreateBody,
    });
  typia.assert(authorizedCustomer);

  // Step 2: Use returned refresh token to get new access token
  const refreshTokenBody = {
    refresh_token: authorizedCustomer.token.refresh,
  } satisfies IShoppingMallCustomer.IRefresh;

  const refreshedCustomer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.refresh(connection, {
      body: refreshTokenBody,
    });
  typia.assert(refreshedCustomer);

  // Step 3: Validate tokens populated and well-formed
  TestValidator.predicate(
    "refreshed customer access token should be a non-empty string",
    typeof refreshedCustomer.token.access === "string" &&
      refreshedCustomer.token.access.length > 0,
  );
  TestValidator.predicate(
    "refreshed customer refresh token should be a non-empty string",
    typeof refreshedCustomer.token.refresh === "string" &&
      refreshedCustomer.token.refresh.length > 0,
  );

  // Step 4: Check new tokens differ from original ones to confirm refresh
  TestValidator.notEquals(
    "refresh token in response should differ from original",
    refreshedCustomer.token.refresh,
    authorizedCustomer.token.refresh,
  );
  TestValidator.notEquals(
    "access token in response should differ from original",
    refreshedCustomer.token.access,
    authorizedCustomer.token.access,
  );

  // Step 5: Confirm customer ID and email unchanged, ensuring same user
  TestValidator.equals(
    "customer ID remains the same after refresh",
    refreshedCustomer.id,
    authorizedCustomer.id,
  );
  TestValidator.equals(
    "customer email remains the same after refresh",
    refreshedCustomer.email,
    authorizedCustomer.email,
  );

  // Step 6: Verify that the expiration dates of tokens are ISO string format and valid
  TestValidator.predicate(
    "access token expired_at should be valid ISO date",
    typeof refreshedCustomer.token.expired_at === "string" &&
      !isNaN(Date.parse(refreshedCustomer.token.expired_at)),
  );
  TestValidator.predicate(
    "refresh token refreshable_until should be valid ISO date",
    typeof refreshedCustomer.token.refreshable_until === "string" &&
      !isNaN(Date.parse(refreshedCustomer.token.refreshable_until)),
  );
}
