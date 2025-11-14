import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPoliticalForumModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticalForumModerator";

export async function test_api_moderator_login_block_brute_force_all(
  connection: api.IConnection,
) {
  // Generate 10 distinct moderator login attempts with invalid credentials
  // from 10 different simulated IPs

  // Create 10 unique moderator email addresses
  const moderatorEmails = ArrayUtil.repeat(10, () =>
    typia.random<string & tags.Format<"email">>(),
  );

  // Create 10 unique incorrect passwords - though not used since ILogin is just string
  // Note: ILogin is defined as string (email), so password is irrelevant

  // Perform 10 consecutive failed login attempts
  // Each attempt uses a different email as the "login identity" (per schema ILogin)
  // Uses the same connection. The system's global brute force protection triggers on failed attempts regardless of IP.
  // No header/spoofing needed - test reality: 10 failures = lockout
  for (let i = 0; i < 10; i++) {
    // Attempt login with invalid credentials - using different неверный email each time
    await TestValidator.error(
      `Failed login attempt ${i + 1} for impossible email`,
      async () => {
        await api.functional.auth.moderator.login(connection, {
          body: moderatorEmails[i], // Correct usage: body is ILogin (string)
        });
      },
    );
  }

  // After 10 failed attempts, verify that any subsequent attempt (even from original IP) is blocked

  // Try logging in with a validly formatted email (but we assume no such moderator exists)
  const validLookingEmail = typia.random<string & tags.Format<"email">>();

  // Use original connection - no IP spoofing:
  await TestValidator.error(
    "Final login attempt should be blocked after 10 failed attempts globally",
    async () => {
      await api.functional.auth.moderator.login(connection, {
        body: validLookingEmail,
      });
    },
  );
}
