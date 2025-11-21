import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityBBSModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBBSModerator";

export async function test_api_moderator_login_invalid_email(
  connection: api.IConnection,
) {
  // Test moderator login with non-existent email address to verify proper 401 Unauthorized response
  // Use random email format to ensure it's definitely not registered in system
  const invalidEmail =
    RandomGenerator.alphaNumeric(20) + "@nonexistent.example.com";
  const invalidPassword = RandomGenerator.alphaNumeric(16);

  // Expect 401 Unauthorized error when attempting to authenticate with non-existent email
  await TestValidator.error(
    "non-existent moderator email should return 401 Unauthorized",
    async () => {
      await api.functional.auth.moderator.login(connection, {
        body: {
          email: invalidEmail,
          password: invalidPassword,
        } satisfies ICommunityBBSModerator.ILogin,
      });
    },
  );
}
