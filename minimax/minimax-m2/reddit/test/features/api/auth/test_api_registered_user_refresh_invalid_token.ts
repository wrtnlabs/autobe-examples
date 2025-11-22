import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditPlatformRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformRegisteredUser";

/**
 * Test refresh operation with completely invalid refresh token format.
 *
 * This test validates that the system properly rejects refresh requests with
 * malformed tokens. First creates a registered user account, then attempts to
 * refresh using a token that doesn't correspond to any existing session. This
 * ensures the system validates token existence and rejects tokens that don't
 * exist in the session database.
 *
 * The test verifies proper security validation by attempting refresh with:
 *
 * 1. A valid UUID format token that doesn't correspond to any session
 * 2. Testing that the system properly validates session existence
 *
 * Expected behavior: System should reject the non-existent token with
 * appropriate error handling, demonstrating robust token validation and session
 * verification.
 */
export async function test_api_registered_user_refresh_invalid_token(
  connection: api.IConnection,
) {
  // Step 1: Create a registered user account to establish baseline authentication
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userUsername = RandomGenerator.alphabets(8);

  const user = await api.functional.auth.registeredUser.join(connection, {
    body: {
      username: userUsername,
      email: userEmail,
      password: "TestPassword123!",
      href: "https://example.com/register",
      referrer: "https://google.com",
    } satisfies IRedditPlatformRegisteredUser.ICreate,
  });
  typia.assert(user);

  // Step 2: Attempt refresh with a token that doesn't correspond to any session
  // Generate a valid UUID format but use a completely different UUID that doesn't exist
  const invalidRefreshToken = typia.random<string & tags.Format<"uuid">>();

  await TestValidator.error(
    "refresh should fail with non-existent token",
    async () => {
      await api.functional.auth.registeredUser.refresh(connection, {
        body: {
          refreshToken: invalidRefreshToken,
          href: "https://example.com/refresh",
          referrer: "https://example.com/auth",
        } satisfies IRedditPlatformRegisteredUser.IRefresh,
      });
    },
  );
}
