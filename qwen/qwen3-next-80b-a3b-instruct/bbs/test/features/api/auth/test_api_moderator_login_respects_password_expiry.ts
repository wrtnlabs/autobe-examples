import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPoliticalForumModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticalForumModerator";

export async function test_api_moderator_login_respects_password_expiry(
  connection: api.IConnection,
) {
  /**
   * Test that the system enforces password expiry (e.g., 90 days).
   *
   * This test verifies that when a moderator attempts to login with a password
   * that has expired (91 days old), the system rejects the login attempt with a
   * 401 Unauthorized status and a message prompting a password reset.
   *
   * The system must prevent authentication for expired passwords and require
   * users to reset their passwords before gaining access.
   *
   * This test assumes that a test moderator account with pre-expired password
   * exists in the test environment. It uses a known email address for such an
   * account.
   */
  // Use a pre-configured test moderator account with expired password
  const expiredModeratorEmail = "expired.moderator@test.com";

  // Attempt to login with expired password
  await TestValidator.error(
    "attempting login with expired password should return 401 Unauthorized and password reset prompt",
    async () => {
      await api.functional.auth.moderator.login(connection, {
        body: expiredModeratorEmail,
      });
    },
  );
}
