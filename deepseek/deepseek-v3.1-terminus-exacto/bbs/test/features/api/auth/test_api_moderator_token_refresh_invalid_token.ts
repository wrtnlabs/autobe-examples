import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Comprehensive test for authentication token refresh failure scenarios with
 * invalid refresh tokens.
 *
 * This test validates that the refresh endpoint properly rejects expired,
 * invalid, and revoked refresh tokens to ensure security integrity. The test
 * follows a complete workflow: creates a moderator account, obtains valid JWT
 * tokens through authentication, and then attempts token refresh with various
 * invalid token scenarios.
 *
 * Security considerations include preventing token reuse and unauthorized
 * access attempts through proper error handling and authentication failure
 * responses.
 */
export async function test_api_moderator_token_refresh_invalid_token(
  connection: api.IConnection,
) {
  // 1. Create moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = "securePassword123";

  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      username: RandomGenerator.name(1),
      password: moderatorPassword,
      display_name: RandomGenerator.paragraph({ sentences: 2 }),
      bio: RandomGenerator.content({ paragraphs: 1 }),
      moderation_level: "basic",
      href: "https://example.com/dashboard",
      referrer: "https://example.com",
    } satisfies IDiscussionBoardModerator.ICreate,
  });
  typia.assert(moderator);

  // 2. Authenticate to get valid tokens
  const authenticated = await api.functional.auth.moderator.login(connection, {
    body: {
      email_or_username: moderatorEmail,
      password: moderatorPassword,
      href: "https://example.com/dashboard",
      referrer: "https://example.com",
    } satisfies IDiscussionBoardModerator.ILogin,
  });
  typia.assert(authenticated);

  // Store the original authentication header for later validation
  const originalAuthHeader = connection.headers?.Authorization;

  // 3. Test invalid refresh token format (random string)
  await TestValidator.error("malformed token should fail", async () => {
    await api.functional.auth.moderator.refresh(connection, {
      body: {
        refresh_token: RandomGenerator.alphaNumeric(32),
      } satisfies IDiscussionBoardModerator.IRefresh,
    });
  });

  // 4. Test invalid refresh token format (empty string)
  await TestValidator.error("empty token should fail", async () => {
    await api.functional.auth.moderator.refresh(connection, {
      body: {
        refresh_token: "",
      } satisfies IDiscussionBoardModerator.IRefresh,
    });
  });

  // 5. Test using modified version of the actual refresh token
  // This simulates a scenario where the token is tampered with
  if (authenticated.token.refresh) {
    await TestValidator.error("modified valid token should fail", async () => {
      // Create a modified version of the actual refresh token
      const modifiedToken =
        authenticated.token.refresh.slice(0, -10) +
        RandomGenerator.alphaNumeric(10);

      await api.functional.auth.moderator.refresh(connection, {
        body: {
          refresh_token: modifiedToken,
        } satisfies IDiscussionBoardModerator.IRefresh,
      });
    });
  }

  // 6. Test invalid refresh token format (structured but incorrect)
  await TestValidator.error(
    "structured invalid token should fail",
    async () => {
      await api.functional.auth.moderator.refresh(connection, {
        body: {
          refresh_token:
            "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c",
        } satisfies IDiscussionBoardModerator.IRefresh,
      });
    },
  );

  // 7. Test expired refresh token handling
  await TestValidator.error("expired token should fail", async () => {
    await api.functional.auth.moderator.refresh(connection, {
      body: {
        refresh_token:
          "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjE1MTYyMzkwMjJ9.invalid_expired_token_signature",
      } satisfies IDiscussionBoardModerator.IRefresh,
    });
  });

  // 8. Test revoked refresh token handling
  await TestValidator.error("revoked token should fail", async () => {
    await api.functional.auth.moderator.refresh(connection, {
      body: {
        refresh_token:
          "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0IiwiaWF0IjoxNTE2MjM5MDIyLCJqdGkiOiJyZXZva2VkX3Rva2VuX2lkIn0.invalid_revoked_token_signature",
      } satisfies IDiscussionBoardModerator.IRefresh,
    });
  });

  // 9. Security validation: Ensure authentication header remains unchanged
  // After all invalid refresh attempts, the original authentication should still be valid
  TestValidator.equals(
    "authentication header should not change after failed refresh attempts",
    connection.headers?.Authorization,
    originalAuthHeader,
  );

  // 10. Final validation: Verify that valid operations still work after failed attempts
  // This ensures the system remains in a consistent state
  const stillValid = await api.functional.auth.moderator.login(connection, {
    body: {
      email_or_username: moderatorEmail,
      password: moderatorPassword,
      href: "https://example.com/dashboard",
      referrer: "https://example.com",
    } satisfies IDiscussionBoardModerator.ILogin,
  });
  typia.assert(stillValid);

  TestValidator.equals(
    "valid authentication should still work after invalid refresh attempts",
    stillValid.email,
    moderatorEmail,
  );
}
