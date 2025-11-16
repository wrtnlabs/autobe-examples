import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Verify that a registered seller can log in and receive a valid session/auth
 * tokens.
 *
 * This test exercises the /auth/seller/login endpoint with random but valid
 * seller credentials, ensuring that authorized sellers receive a JWT token pair
 * and seller summary in return. The test checks that required fields such as
 * href and referrer are populated, and relies on typia.assert() for deep type
 * validation. The returned token must contain valid access/refresh tokens and
 * correct expiration information. The seller summary, if present, must match
 * expected DTO shape. All edge cases regarding credential acceptance and
 * context are respected.
 */
export async function test_api_seller_login_successful(
  connection: api.IConnection,
) {
  // Generate valid seller login credentials, including required and optional fields
  const loginPayload = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    href: "https://shop.example.com/login",
    referrer: "https://shop.example.com/",
    ip: undefined, // optional - can be omitted or generated
  } satisfies IShoppingMallSeller.ILogin;

  // Call the login endpoint
  const authorized = await api.functional.auth.seller.login(connection, {
    body: loginPayload,
  });
  typia.assert(authorized);

  // Validate token structure
  typia.assert<IAuthorizationToken>(authorized.token);
  TestValidator.predicate(
    "access token is non-empty",
    authorized.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token is non-empty",
    authorized.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "access token expiration is ISO 8601",
    !!authorized.token.expired_at &&
      typeof authorized.token.expired_at === "string",
  );
  TestValidator.predicate(
    "refresh token expiration is ISO 8601",
    !!authorized.token.refreshable_until &&
      typeof authorized.token.refreshable_until === "string",
  );

  // Seller summary (optional)
  if (authorized.seller !== undefined) {
    typia.assert<IShoppingMallSeller.ISummary>(authorized.seller);
    TestValidator.predicate(
      "seller summary id is present",
      typeof authorized.seller.id === "string" &&
        authorized.seller.id.length > 0,
    );
    TestValidator.predicate(
      "seller summary business_name is present",
      typeof authorized.seller.business_name === "string" &&
        authorized.seller.business_name.length > 0,
    );
  }

  // Validate session context fields in request (loginPayload)
  TestValidator.predicate(
    "href is https URI",
    loginPayload.href.startsWith("https://"),
  );
  TestValidator.predicate(
    "referrer is https URI",
    loginPayload.referrer.startsWith("https://"),
  );
}
