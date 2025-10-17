import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Test the seller login workflow by first registering a new seller account and
 * then logging in with valid credentials. Validate successful JWT token
 * issuance, correct role permissions, and failure scenarios with invalid
 * passwords or non-existing email. Ensure all steps include proper
 * authentication flow for the seller role.
 */
export async function test_api_seller_login_existing(
  connection: api.IConnection,
) {
  // Register seller account
  const password = "password123";
  const email = typia.random<string & tags.Format<"email">>();
  const sellerCreateBody = {
    email: email,
    password_hash: password,
    company_name: null,
    contact_name: null,
    phone_number: null,
    status: "active" as const,
  } satisfies IShoppingMallSeller.ICreate;

  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerCreateBody,
    });
  typia.assert(seller);

  // Validate seller create response
  TestValidator.equals("Seller email matches", seller.email, email);
  TestValidator.equals("Seller status active", seller.status, "active");
  TestValidator.predicate(
    "Seller token not empty",
    Boolean(seller.token.access),
  );
  TestValidator.predicate(
    "Seller refresh token not empty or null",
    seller.refresh_token === null || typeof seller.refresh_token === "string",
  );

  // Login with correct credentials
  const loginBody = {
    email: email,
    password: password,
  } satisfies IShoppingMallSeller.ILogin;

  const loginResult: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, { body: loginBody });
  typia.assert(loginResult);

  TestValidator.equals("Login email matches", loginResult.email, email);
  TestValidator.equals("Login status active", loginResult.status, "active");
  TestValidator.predicate(
    "Login token not empty",
    Boolean(loginResult.token.access),
  );
  TestValidator.predicate(
    "Login refresh token is string or null",
    loginResult.refresh_token === null ||
      typeof loginResult.refresh_token === "string",
  );

  // Login with wrong password
  await TestValidator.error("Login fails with wrong password", async () => {
    await api.functional.auth.seller.login(connection, {
      body: {
        email: email,
        password: "wrongPassword",
      } satisfies IShoppingMallSeller.ILogin,
    });
  });

  // Login with non-existing email
  await TestValidator.error("Login fails with non-existent email", async () => {
    await api.functional.auth.seller.login(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "anyPassword",
      } satisfies IShoppingMallSeller.ILogin,
    });
  });
}
