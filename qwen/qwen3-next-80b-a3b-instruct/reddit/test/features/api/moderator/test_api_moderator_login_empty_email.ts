import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityBBSModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBBSModerator";

export async function test_api_moderator_login_empty_email(
  connection: api.IConnection,
) {
  // Test moderator login with empty email to verify input validation
  // This should return 400 Bad Request with proper error handling
  await TestValidator.error(
    "login with empty email should return 400 Bad Request",
    async () => {
      await api.functional.auth.moderator.login(connection, {
        body: {
          email: "", // Empty email - required field violation
          password: "SecurePass123!", // Valid password
        } satisfies ICommunityBBSModerator.ILogin,
      });
    },
  );
}
