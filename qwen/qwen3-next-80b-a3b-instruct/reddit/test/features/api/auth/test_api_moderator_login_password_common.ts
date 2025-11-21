import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityBBSModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBBSModerator";

export async function test_api_moderator_login_password_common(
  connection: api.IConnection,
) {
  // Test moderator login with a password known to be commonly used and easily guessed (e.g., 'password123')
  // This scenario confirms that the system validates against a dictionary of commonly compromised passwords
  // and denies authentication for weak passwords to enhance security against brute force attacks.

  // Use a known weak password from common password lists
  const weakPassword = "password123";

  // Use a valid email format for a moderator
  const moderatorEmail = typia.random<string & tags.Format<"email">>();

  // Prepare the login request with the weak password
  const loginBody = {
    email: moderatorEmail,
    password: weakPassword,
  } satisfies ICommunityBBSModerator.ILogin;

  // Execute the login attempt and expect it to fail with a 401 Unauthorized error
  // because the system should reject common passwords
  await TestValidator.error(
    "moderator login with common password should be denied",
    async () => {
      await api.functional.auth.moderator.login(connection, {
        body: loginBody,
      });
    },
  );
}
