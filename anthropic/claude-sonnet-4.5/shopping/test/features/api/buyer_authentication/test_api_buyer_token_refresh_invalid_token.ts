import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallBuyer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBuyer";

/**
 * Test buyer token refresh behavior when using invalid or malformed refresh
 * tokens.
 *
 * This test validates the security of the token refresh endpoint by ensuring it
 * properly rejects various forms of invalid refresh tokens. The refresh token
 * mechanism is critical for maintaining authenticated sessions without
 * requiring users to re-enter credentials, so strict validation is essential to
 * prevent unauthorized access.
 *
 * Test scenarios:
 *
 * 1. Create a buyer account to establish authentication context
 * 2. Attempt token refresh with completely random string (non-JWT format)
 * 3. Attempt token refresh with malformed JWT structure
 * 4. Attempt token refresh with empty string
 * 5. Verify all invalid token attempts are properly rejected
 *
 * Security validation:
 *
 * - Invalid tokens must be rejected without exposing internal details
 * - Error responses should not reveal information about valid token structure
 * - Each invalid attempt should fail with appropriate error handling
 */
export async function test_api_buyer_token_refresh_invalid_token(
  connection: api.IConnection,
) {
  // Create a valid buyer account to establish authentication context
  const buyerData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
    full_name: RandomGenerator.name(),
    phone_number: RandomGenerator.mobile(),
    href: "https://example.com/register",
    referrer: "https://example.com/home",
  } satisfies IShoppingMallBuyer.ICreate;

  const buyer: IShoppingMallBuyer.IAuthorized =
    await api.functional.auth.buyer.join(connection, {
      body: buyerData,
    });
  typia.assert(buyer);

  // Test 1: Attempt refresh with completely random string (non-JWT format)
  await TestValidator.error(
    "should reject random string as invalid refresh token",
    async () => {
      await api.functional.auth.buyer.refresh(connection, {
        body: {
          refresh: RandomGenerator.alphaNumeric(32),
        } satisfies IShoppingMallBuyer.IRefresh,
      });
    },
  );

  // Test 2: Attempt refresh with malformed JWT-like structure
  await TestValidator.error(
    "should reject malformed JWT structure",
    async () => {
      await api.functional.auth.buyer.refresh(connection, {
        body: {
          refresh: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.invalid.signature",
        } satisfies IShoppingMallBuyer.IRefresh,
      });
    },
  );

  // Test 3: Attempt refresh with empty string
  await TestValidator.error(
    "should reject empty string as refresh token",
    async () => {
      await api.functional.auth.buyer.refresh(connection, {
        body: {
          refresh: "",
        } satisfies IShoppingMallBuyer.IRefresh,
      });
    },
  );

  // Test 4: Attempt refresh with arbitrary invalid JWT
  await TestValidator.error(
    "should reject invalid JWT with fake signature",
    async () => {
      await api.functional.auth.buyer.refresh(connection, {
        body: {
          refresh:
            "eyJhbGciOiJub25lIn0.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.",
        } satisfies IShoppingMallBuyer.IRefresh,
      });
    },
  );
}
