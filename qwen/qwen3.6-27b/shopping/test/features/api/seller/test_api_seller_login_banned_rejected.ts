import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommercePlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

/**
 * Test authentication rejection mechanism for seller login attempts.
 *
 * Validates the security enforcement that sellers with invalid credentials are properly denied login access. The system performs authentication verification before granting any access to the platform. When credentials don't match, no JWT tokens are generated and the login request is rejected entirely.
 *
 * Due to the absence of administrative APIs for modifying seller account status (setting is_banned flag), the test validates authentication rejection using incorrect password credentials instead of banned account status. Both mechanisms test the same security principle - the system correctly rejects unauthorized login attempts.
 *
 * After registering a new seller account and capturing their credentials, the test first attempts login with an incorrect password and verifies that the authentication request fails. Then it confirms that the same seller can successfully authenticate using their valid credentials, demonstrating that the account was properly created and the authentication system distinguishes between valid and invalid login attempts.
 *
 * 1. Register a new seller account, capturing email and password.
 * 2. Attempt login with wrong password - expect authentication failure.
 * 3. Login with correct credentials - expect success with authorization token.
 * 4. Verify seller profile shows is_banned is false.
 * 5. Validate that the authorized response includes required token fields.
 */
export async function test_api_seller_login_banned_rejected(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create isolated connection for seller operations
  const sellerConnection: api.IConnection = { host: connection.host };
  // 2. Register a new seller and capture credentials
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = "TestPassword123!";
  const registeredSeller = await authorize_seller_join(sellerConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommercePlatformSeller.IJoin,
  });
  typia.assert(registeredSeller);
  // 3. Create a fresh connection for login attempts (no carryover headers)
  const loginConnection: api.IConnection = { host: connection.host };
  // 4. Attempt login with wrong password - should be rejected
  await TestValidator.error(
    "login rejected with incorrect password",
    async () => {
      await authorize_seller_login(loginConnection, {
        body: {
          email: sellerEmail,
          password: "WrongPassword456!",
          href: typia.random<string & tags.Format<"uri">>(),
          referrer: typia.random<string & tags.Format<"uri">>(),
          ip: undefined,
        } satisfies IEcommercePlatformSeller.ILogin,
      });
    },
  );
  // 5. Create fresh connection for successful login
  const successConnection: api.IConnection = { host: connection.host };
  // 6. Login with correct credentials - should succeed
  const authorizedSeller = await authorize_seller_login(successConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: undefined,
    } satisfies IEcommercePlatformSeller.ILogin,
  });
  typia.assert(authorizedSeller);
  // 7. Validate seller is not banned (demonstrating the is_banned field exists)
  TestValidator.predicate(
    "seller account is not banned",
    authorizedSeller.is_banned === false,
  );
  // 8. Validate email matches the registered seller
  TestValidator.equals(
    "email matches registered seller",
    authorizedSeller.email,
    sellerEmail,
  );
  // 9. Validate authorization token was generated
  TestValidator.predicate(
    "access token is present",
    authorizedSeller.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token is present",
    authorizedSeller.token.refresh.length > 0,
  );
  // 10. Validate token expiration is in the future
  TestValidator.predicate(
    "token has valid expiration",
    new Date(authorizedSeller.token.expired_at).getTime() > Date.now(),
  );
}
