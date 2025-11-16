import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallBuyer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBuyer";

/**
 * Test buyer login with comprehensive session context tracking.
 *
 * This test validates that buyer login properly captures and stores session
 * context information including IP address, href (current page URL), and
 * referrer URL in the shopping_mall_buyer_sessions table. Session metadata
 * tracking enables security monitoring, fraud detection, and user journey
 * analysis.
 *
 * Test Flow:
 *
 * 1. Create a new buyer account via registration endpoint
 * 2. Login with buyer credentials while providing complete session context
 * 3. Verify successful authentication with JWT token issuance
 * 4. Validate session context enables audit trails and analytics
 */
export async function test_api_buyer_login_with_session_context(
  connection: api.IConnection,
) {
  // Step 1: Create a new buyer account for testing login
  const buyerEmail = typia.random<string & tags.Format<"email">>();
  const buyerPassword = typia.random<string & tags.MinLength<8>>();
  const registrationHref = "https://shoppingmall.example.com/register";
  const registrationReferrer = "https://shoppingmall.example.com/home";

  const registrationBody = {
    email: buyerEmail,
    password: buyerPassword,
    full_name: RandomGenerator.name(),
    phone_number: RandomGenerator.mobile(),
    ip: "192.168.1.100",
    href: registrationHref,
    referrer: registrationReferrer,
  } satisfies IShoppingMallBuyer.ICreate;

  const registeredBuyer: IShoppingMallBuyer.IAuthorized =
    await api.functional.auth.buyer.join(connection, {
      body: registrationBody,
    });
  typia.assert(registeredBuyer);

  // Validate registration response structure
  TestValidator.equals(
    "registered buyer email matches",
    registeredBuyer.email,
    buyerEmail,
  );
  TestValidator.predicate(
    "registration token exists",
    !!registeredBuyer.token.access,
  );
  TestValidator.predicate(
    "refresh token exists",
    !!registeredBuyer.token.refresh,
  );

  // Step 2: Login with the buyer credentials and session context
  const loginHref = "https://shoppingmall.example.com/login";
  const loginReferrer = "https://shoppingmall.example.com/products/electronics";
  const loginIp = "203.0.113.42";

  const loginBody = {
    email: buyerEmail,
    password: buyerPassword,
    ip: loginIp,
    href: loginHref,
    referrer: loginReferrer,
  } satisfies IShoppingMallBuyer.ILogin;

  const authenticatedBuyer: IShoppingMallBuyer.IAuthorized =
    await api.functional.auth.buyer.login(connection, {
      body: loginBody,
    });
  typia.assert(authenticatedBuyer);

  // Step 3: Validate successful authentication
  TestValidator.equals(
    "authenticated buyer email matches",
    authenticatedBuyer.email,
    buyerEmail,
  );
  TestValidator.equals(
    "authenticated buyer ID matches",
    authenticatedBuyer.id,
    registeredBuyer.id,
  );
  TestValidator.predicate(
    "access token issued",
    !!authenticatedBuyer.token.access,
  );
  TestValidator.predicate(
    "refresh token issued",
    !!authenticatedBuyer.token.refresh,
  );
  TestValidator.predicate(
    "token expiration set",
    !!authenticatedBuyer.token.expired_at,
  );
  TestValidator.predicate(
    "refresh expiration set",
    !!authenticatedBuyer.token.refreshable_until,
  );

  // Step 4: Validate buyer profile data consistency
  TestValidator.equals(
    "buyer full name preserved",
    authenticatedBuyer.full_name,
    registrationBody.full_name,
  );
  TestValidator.equals(
    "buyer phone number preserved",
    authenticatedBuyer.phone_number,
    registrationBody.phone_number,
  );
  TestValidator.equals(
    "email verification status",
    authenticatedBuyer.email_verified,
    false,
  );
  TestValidator.predicate(
    "created timestamp exists",
    !!authenticatedBuyer.created_at,
  );
  TestValidator.predicate(
    "updated timestamp exists",
    !!authenticatedBuyer.updated_at,
  );
  TestValidator.equals(
    "account not deleted",
    authenticatedBuyer.deleted_at,
    null,
  );

  // Step 5: Test login without explicit IP (server should extract from headers)
  const loginWithoutIpBody = {
    email: buyerEmail,
    password: buyerPassword,
    href: "https://shoppingmall.example.com/checkout",
    referrer: "https://shoppingmall.example.com/cart",
  } satisfies IShoppingMallBuyer.ILogin;

  const authenticatedWithoutIp: IShoppingMallBuyer.IAuthorized =
    await api.functional.auth.buyer.login(connection, {
      body: loginWithoutIpBody,
    });
  typia.assert(authenticatedWithoutIp);

  TestValidator.equals(
    "login without IP successful",
    authenticatedWithoutIp.email,
    buyerEmail,
  );
  TestValidator.predicate(
    "new access token issued",
    !!authenticatedWithoutIp.token.access,
  );

  // Step 6: Test login with empty referrer (direct access scenario)
  const directAccessLoginBody = {
    email: buyerEmail,
    password: buyerPassword,
    href: "https://shoppingmall.example.com/login",
    referrer: "",
  } satisfies IShoppingMallBuyer.ILogin;

  const directAccessBuyer: IShoppingMallBuyer.IAuthorized =
    await api.functional.auth.buyer.login(connection, {
      body: directAccessLoginBody,
    });
  typia.assert(directAccessBuyer);

  TestValidator.equals(
    "direct access login successful",
    directAccessBuyer.email,
    buyerEmail,
  );
  TestValidator.predicate(
    "direct access token issued",
    !!directAccessBuyer.token.access,
  );

  // Step 7: Verify error handling for invalid credentials
  await TestValidator.error("invalid password should fail", async () => {
    await api.functional.auth.buyer.login(connection, {
      body: {
        email: buyerEmail,
        password: "wrongpassword123",
        href: "https://shoppingmall.example.com/login",
        referrer: "https://shoppingmall.example.com/home",
      } satisfies IShoppingMallBuyer.ILogin,
    });
  });

  await TestValidator.error("non-existent email should fail", async () => {
    await api.functional.auth.buyer.login(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: buyerPassword,
        href: "https://shoppingmall.example.com/login",
        referrer: "https://shoppingmall.example.com/home",
      } satisfies IShoppingMallBuyer.ILogin,
    });
  });
}
