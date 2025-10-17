import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IETodoRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IETodoRole";
import type { IMemberCreate } from "@ORGANIZATION/PROJECT-api/lib/structures/IMemberCreate";
import type { IMemberLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IMemberLogin";
import type { ITodoMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoMember";
import type { ITokenRefresh } from "@ORGANIZATION/PROJECT-api/lib/structures/ITokenRefresh";

/**
 * Test token refresh attempt with an expired or invalid refresh token.
 *
 * This test validates the security boundary of the token refresh mechanism by
 * attempting to use invalid, expired, and malformed refresh tokens. The test
 * ensures proper error handling and rejection of compromised tokens.
 *
 * Test scenarios:
 *
 * 1. Valid member registration and login to obtain legitimate tokens
 * 2. Attempt refresh with completely invalid random string token
 * 3. Attempt refresh with malformed token structure (modified valid token)
 * 4. Attempt refresh with expired token scenario (simulated)
 * 5. Verify error responses are appropriate for security failures
 *
 * This ensures the refresh endpoint properly validates token authenticity and
 * provides secure error handling for authentication edge cases.
 */
export async function test_api_member_token_refresh_invalid_token(
  connection: api.IConnection,
) {
  // Step 1: Create a valid member account for testing
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = RandomGenerator.alphaNumeric(10);

  const memberAccount = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
    } satisfies IMemberCreate.IRequest,
  });
  typia.assert(memberAccount);

  // Verify member account was created successfully
  TestValidator.equals(
    "member role should be valid",
    memberAccount.role,
    "member",
  );
  TestValidator.predicate(
    "member should have valid tokens",
    memberAccount.token.access.length > 0,
  );
  TestValidator.predicate(
    "member should have valid refresh token",
    memberAccount.token.refresh.length > 0,
  );

  // Step 2: Login to get fresh tokens for comparative testing
  const loginResponse = await api.functional.auth.member.login(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
    } satisfies IMemberLogin.IRequest,
  });
  typia.assert(loginResponse);

  // Verify login was successful and tokens are valid
  TestValidator.equals(
    "login member role should be valid",
    loginResponse.role,
    "member",
  );
  TestValidator.predicate(
    "login should provide access token",
    loginResponse.token.access.length > 0,
  );
  TestValidator.predicate(
    "login should provide refresh token",
    loginResponse.token.refresh.length > 0,
  );

  // Step 3: Test refresh with completely invalid random token
  const invalidToken = RandomGenerator.alphaNumeric(64);
  await TestValidator.error(
    "should reject random alphanumeric token",
    async () => {
      await api.functional.auth.member.refresh(connection, {
        body: {
          refresh: invalidToken,
        } satisfies ITokenRefresh.IRequest,
      });
    },
  );

  // Step 4: Test refresh with malformed JWT-like string
  const malformedToken = "invalid.jwt.structure.with.random.payload";
  await TestValidator.error("should reject malformed JWT token", async () => {
    await api.functional.auth.member.refresh(connection, {
      body: {
        refresh: malformedToken,
      } satisfies ITokenRefresh.IRequest,
    });
  });

  // Step 5: Test refresh with token from different context
  const differentContextToken =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c";
  await TestValidator.error("should reject foreign JWT token", async () => {
    await api.functional.auth.member.refresh(connection, {
      body: {
        refresh: differentContextToken,
      } satisfies ITokenRefresh.IRequest,
    });
  });

  // Step 6: Test refresh with empty token value
  await TestValidator.error("should reject empty refresh token", async () => {
    await api.functional.auth.member.refresh(connection, {
      body: {
        refresh: "",
      } satisfies ITokenRefresh.IRequest,
    });
  });

  // Step 7: Verify that valid refresh still works after invalid attempts
  const validRefreshResponse = await api.functional.auth.member.refresh(
    connection,
    {
      body: {
        refresh: loginResponse.token.refresh,
      } satisfies ITokenRefresh.IRequest,
    },
  );
  typia.assert(validRefreshResponse);

  // Verify valid refresh was successful
  TestValidator.equals(
    "refreshed member should maintain same ID",
    validRefreshResponse.id,
    loginResponse.id,
  );
  TestValidator.equals(
    "refreshed member should maintain same email",
    validRefreshResponse.email,
    loginResponse.email,
  );
  TestValidator.equals(
    "refreshed member should maintain same role",
    validRefreshResponse.role,
    loginResponse.role,
  );
  TestValidator.predicate(
    "refresh should provide new access token",
    validRefreshResponse.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh should provide new refresh token",
    validRefreshResponse.token.refresh.length > 0,
  );

  // Verify tokens are different (security rotation)
  TestValidator.notEquals(
    "access token should be refreshed",
    validRefreshResponse.token.access,
    loginResponse.token.access,
  );
  TestValidator.notEquals(
    "refresh token should be rotated",
    validRefreshResponse.token.refresh,
    loginResponse.token.refresh,
  );
}
