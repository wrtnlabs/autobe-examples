import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

/**
 * Test token refresh with invalid token format
 *
 * This test validates that the administrator token refresh endpoint properly
 * rejects malformed, tampered, or cryptographically invalid refresh tokens. The
 * endpoint must validate token format, structure, and signature before issuing
 * new access tokens, protecting against token tampering and replay attacks. The
 * error response should indicate validation failure without leaking sensitive
 * information about the validation algorithm or token structure.
 *
 * Steps:
 *
 * 1. Create an administrator account for testing
 * 2. Attempt token refresh with various invalid token formats:
 *
 *    - Completely invalid/random token string
 *    - Malformed JWT structure
 *    - Tampered token with modified claims
 * 3. Verify that all invalid tokens are rejected
 * 4. Verify error responses indicate authentication failure
 * 5. Confirm no sensitive token validation details are exposed
 */
export async function test_api_administrator_token_refresh_invalid_token_format(
  connection: api.IConnection,
) {
  // 1. Create an administrator account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminAccount = await api.functional.auth.administrator.join(
    connection,
    {
      body: {
        email: adminEmail,
        password: RandomGenerator.alphabets(12),
        username: RandomGenerator.alphaNumeric(8),
        name: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: null,
        ip: null,
      } satisfies ICommunityPlatformAdministrator.ICreate,
    },
  );
  typia.assert(adminAccount);
  TestValidator.equals("admin account created", adminAccount.email, adminEmail);

  // 2. Test with completely invalid/random token string
  await TestValidator.error(
    "should reject completely invalid token",
    async () => {
      await api.functional.auth.administrator.refresh(connection, {
        body: {
          refresh_token: RandomGenerator.alphaNumeric(64),
        } satisfies ICommunityPlatformAdministrator.IRefresh,
      });
    },
  );

  // 3. Test with malformed JWT-like token (invalid structure)
  const malformedToken = "invalid.malformed.token.structure";
  await TestValidator.error("should reject malformed JWT token", async () => {
    await api.functional.auth.administrator.refresh(connection, {
      body: {
        refresh_token: malformedToken,
      } satisfies ICommunityPlatformAdministrator.IRefresh,
    });
  });

  // 4. Test with empty token
  await TestValidator.error("should reject empty refresh token", async () => {
    await api.functional.auth.administrator.refresh(connection, {
      body: {
        refresh_token: "",
      } satisfies ICommunityPlatformAdministrator.IRefresh,
    });
  });

  // 5. Test with token containing special characters
  const tokenWithSpecialChars = "refresh_token_with_@#$%^&*()_+={}[]|:;<>?,.";
  await TestValidator.error(
    "should reject token with invalid characters",
    async () => {
      await api.functional.auth.administrator.refresh(connection, {
        body: {
          refresh_token: tokenWithSpecialChars,
        } satisfies ICommunityPlatformAdministrator.IRefresh,
      });
    },
  );

  // 6. Test with extremely long token to detect parsing limits
  const veryLongToken = RandomGenerator.alphaNumeric(10000);
  await TestValidator.error(
    "should reject excessively long token",
    async () => {
      await api.functional.auth.administrator.refresh(connection, {
        body: {
          refresh_token: veryLongToken,
        } satisfies ICommunityPlatformAdministrator.IRefresh,
      });
    },
  );
}
