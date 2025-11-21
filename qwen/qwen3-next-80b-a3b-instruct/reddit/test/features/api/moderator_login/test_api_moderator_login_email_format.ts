import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityBBSModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBBSModerator";

export async function test_api_moderator_login_email_format(
  connection: api.IConnection,
) {
  // Generate an email without a @ symbol (invalid format)
  const invalidEmail = "invalidemail.com";
  const password = "SecurePass123!";

  // Attempt login with invalid email format
  await TestValidator.error(
    "login should fail with invalid email format (missing @ symbol)",
    async () => {
      await api.functional.auth.moderator.login(connection, {
        body: {
          email: invalidEmail,
          password: password,
        } satisfies ICommunityBBSModerator.ILogin,
      });
    },
  );
}
