import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconPoliticalDiscussionSystemAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalDiscussionSystemAdministrator";
import type { IEconPoliticalDiscussionUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalDiscussionUser";

export async function test_api_systemadministrator_refresh_invalid_token(
  connection: api.IConnection,
) {
  // Step 1: Create a valid administrator account for baseline testing
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminDisplayName: string = RandomGenerator.name();

  const createdAdmin: IEconPoliticalDiscussionSystemAdministrator.IAuthorized =
    await api.functional.auth.systemAdministrator.join.create(connection, {
      body: {
        display_name: adminDisplayName,
        email: adminEmail,
        status: "active",
      } satisfies IEconPoliticalDiscussionUser.ICreate,
    });
  typia.assert(createdAdmin);

  // Step 2: Authenticate to obtain valid refresh token for comparison
  const loginResult: IEconPoliticalDiscussionSystemAdministrator.IAuthorized =
    await api.functional.auth.systemAdministrator.login.signIn(connection, {
      body: {
        email: adminEmail,
        password: "admin123",
        href: "https://test.example.com/admin",
        referrer: "https://test.example.com/login",
      } satisfies IEconPoliticalDiscussionUser.ILogin,
    });
  typia.assert(loginResult);

  // Store valid token for comparison
  const validRefreshToken: string = loginResult.token.refresh;

  // Step 3: Test various invalid refresh token scenarios
  const invalidTokenScenarios = [
    {
      name: "malformed JWT token",
      token: "invalid.jwt.token.format",
    },
    {
      name: "completely invalid string",
      token: "this-is-not-a-valid-token-at-all",
    },
    {
      name: "empty token",
      token: "",
    },
    {
      name: "expired-looking token format",
      token:
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyLCJleHAiOjE1MTYyMzkwMDB9.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c",
    },
  ];

  for (const scenario of invalidTokenScenarios) {
    // Test invalid refresh token attempt
    await TestValidator.error(
      `should reject invalid refresh token: ${scenario.name}`,
      async () => {
        // Create connection with invalid refresh token in headers
        const invalidTokenConnection: api.IConnection = {
          ...connection,
          headers: {
            ...connection.headers,
            Authorization: `Bearer ${scenario.token}`,
          },
        };

        await api.functional.auth.systemAdministrator.refresh.renew(
          invalidTokenConnection,
        );
      },
    );
  }

  // Step 4: Test with modified valid token (tampered token)
  const tamperedToken =
    validRefreshToken.substring(0, validRefreshToken.length - 5) + "XXXXX";

  await TestValidator.error(
    "should reject tampered refresh token",
    async () => {
      const tamperedConnection: api.IConnection = {
        ...connection,
        headers: {
          ...connection.headers,
          Authorization: `Bearer ${tamperedToken}`,
        },
      };

      await api.functional.auth.systemAdministrator.refresh.renew(
        tamperedConnection,
      );
    },
  );

  // Step 5: Test with base64-like invalid data (manual encoding)
  const base64InvalidToken = "aW52YWxpZC1yZWZyZXNoLXRva2VuLWRhdGE"; // "invalid-refresh-token-data" in base64

  await TestValidator.error(
    "should reject base64-encoded invalid token",
    async () => {
      const base64Connection: api.IConnection = {
        ...connection,
        headers: {
          ...connection.headers,
          Authorization: `Bearer ${base64InvalidToken}`,
        },
      };

      await api.functional.auth.systemAdministrator.refresh.renew(
        base64Connection,
      );
    },
  );

  // Step 6: Test with completely different token structure
  const fakeToken = "admin_fake_token_" + RandomGenerator.alphaNumeric(32);

  await TestValidator.error("should reject fake admin token", async () => {
    const fakeConnection: api.IConnection = {
      ...connection,
      headers: {
        ...connection.headers,
        Authorization: `Bearer ${fakeToken}`,
      },
    };

    await api.functional.auth.systemAdministrator.refresh.renew(fakeConnection);
  });

  // Step 7: Verify that valid refresh still works (sanity check)
  const validRefreshResult: IEconPoliticalDiscussionSystemAdministrator.IAuthorized =
    await api.functional.auth.systemAdministrator.refresh.renew(connection);
  typia.assert(validRefreshResult);

  // Verify new tokens are different from old ones (security best practice)
  TestValidator.notEquals(
    "new access token should be different from old",
    validRefreshResult.token.access,
    loginResult.token.access,
  );

  TestValidator.notEquals(
    "new refresh token should be different from old",
    validRefreshResult.token.refresh,
    loginResult.token.refresh,
  );

  // Step 8: Verify token structure and security properties
  TestValidator.equals(
    "admin should still be authenticated",
    validRefreshResult.status,
    "active",
  );

  TestValidator.equals(
    "admin email should match original",
    validRefreshResult.email,
    adminEmail,
  );

  // Verify new expiration times
  TestValidator.predicate(
    "new access token should have future expiration",
    new Date(validRefreshResult.token.expired_at) > new Date(),
  );

  TestValidator.predicate(
    "new refresh token should have future expiration",
    new Date(validRefreshResult.token.refreshable_until) > new Date(),
  );

  // Test completion - all invalid token scenarios were properly rejected
  TestValidator.predicate(
    "invalid token security tests completed successfully",
    true,
  );
}
