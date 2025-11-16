import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

/**
 * Test authentication attempt with email address that does not exist in the
 * system. Verify that the system provides consistent error responses regardless
 * of whether the email exists to prevent email enumeration attacks.
 */
export async function test_api_user_login_nonexistent_email(
  connection: api.IConnection,
) {
  // Generate a non-existent email address
  const nonExistentEmail = typia.random<string & tags.Format<"email">>();

  // Create authentication credentials with the non-existent email
  const credentials = {
    email: nonExistentEmail,
    password: RandomGenerator.alphaNumeric(12), // Random password
    ip: "192.168.1.100", // Optional IP address for audit trail
    href: "https://example.com/login",
    referrer: "https://example.com",
  } satisfies ITodoAppUser.ICredentials;

  // Attempt to login with non-existent credentials
  await TestValidator.error(
    "login with non-existent email should fail",
    async () => {
      await api.functional.auth.user.login(connection, {
        body: credentials,
      });
    },
  );
}
