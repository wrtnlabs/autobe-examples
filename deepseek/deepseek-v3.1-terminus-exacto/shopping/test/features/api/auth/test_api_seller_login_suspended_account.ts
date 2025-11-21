import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Test seller authentication functionality including successful login and error
 * scenarios.
 *
 * This test validates the seller authentication system by:
 *
 * 1. Creating a seller account with comprehensive business information
 * 2. Testing successful login with valid credentials
 * 3. Testing authentication failure with invalid credentials
 *
 * Note: The original scenario requested testing suspended accounts, but the
 * available API functions do not include account suspension functionality. This
 * test focuses on the authentication functionality that IS available through
 * the provided endpoints.
 */
export async function test_api_seller_login_suspended_account(
  connection: api.IConnection,
) {
  // Generate random test data for seller account
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = "TestPassword123";
  const businessName = RandomGenerator.paragraph({ sentences: 3 });
  const contactPerson = RandomGenerator.name();
  const phoneNumber = RandomGenerator.mobile();
  const businessAddress = RandomGenerator.content({ paragraphs: 1 });

  // Create seller account
  const createdSeller = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      business_name: businessName,
      contact_person: contactPerson,
      phone_number: phoneNumber,
      business_address: businessAddress,
      href: "https://example.com/seller/dashboard" satisfies string &
        tags.Format<"uri">,
      referrer: "https://example.com/seller/registration" satisfies string &
        tags.Format<"uri">,
    } satisfies IShoppingMallSeller.ICreate,
  });
  typia.assert(createdSeller);

  // Validate successful account creation
  TestValidator.equals(
    "created seller email matches",
    createdSeller.email,
    sellerEmail,
  );
  TestValidator.equals(
    "created seller business name matches",
    createdSeller.business_name,
    businessName,
  );
  TestValidator.predicate(
    "seller account should have valid status",
    createdSeller.status.length > 0,
  );
  TestValidator.predicate(
    "seller should have authorization token",
    createdSeller.token.access.length > 0,
  );

  // Test successful login with correct credentials
  const loggedInSeller = await api.functional.auth.seller.login(connection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: "https://example.com/seller/login" satisfies string &
        tags.Format<"uri">,
      referrer: "https://example.com/seller/dashboard" satisfies string &
        tags.Format<"uri">,
    } satisfies IShoppingMallSeller.ILogin,
  });
  typia.assert(loggedInSeller);

  // Validate successful login response
  TestValidator.equals(
    "logged in seller email matches",
    loggedInSeller.email,
    sellerEmail,
  );
  TestValidator.equals(
    "logged in seller business name matches",
    loggedInSeller.business_name,
    businessName,
  );
  TestValidator.predicate(
    "logged in seller should have valid status",
    loggedInSeller.status.length > 0,
  );
  TestValidator.predicate(
    "logged in seller should have authorization token",
    loggedInSeller.token.access.length > 0,
  );

  // Test authentication failure with wrong password
  await TestValidator.error(
    "login should fail with incorrect password",
    async () => {
      await api.functional.auth.seller.login(connection, {
        body: {
          email: sellerEmail,
          password: "WrongPassword123",
          href: "https://example.com/seller/login" satisfies string &
            tags.Format<"uri">,
          referrer: "https://example.com/seller/dashboard" satisfies string &
            tags.Format<"uri">,
        } satisfies IShoppingMallSeller.ILogin,
      });
    },
  );

  // Test authentication failure with non-existent email
  await TestValidator.error(
    "login should fail with non-existent email",
    async () => {
      await api.functional.auth.seller.login(connection, {
        body: {
          email: typia.random<string & tags.Format<"email">>(),
          password: sellerPassword,
          href: "https://example.com/seller/login" satisfies string &
            tags.Format<"uri">,
          referrer: "https://example.com/seller/dashboard" satisfies string &
            tags.Format<"uri">,
        } satisfies IShoppingMallSeller.ILogin,
      });
    },
  );
}
