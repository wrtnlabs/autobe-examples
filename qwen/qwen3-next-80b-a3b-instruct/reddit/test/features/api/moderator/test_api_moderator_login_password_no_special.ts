import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityBBSModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBBSModerator";

export async function test_api_moderator_login_password_no_special(
  connection: api.IConnection,
) {
  const moderatorEmail: string = typia.random<string & tags.Format<"email">>();

  // Generate password that meets all requirements except special character
  // Must be 8-128 chars, with uppercase, lowercase, and number, but no special char
  const lower = RandomGenerator.alphabets(3);
  const upper = RandomGenerator.alphabets(3).toUpperCase();
  const digit = RandomGenerator.alphaNumeric(2).replace(/[a-zA-Z]/g, "");
  const password = `${lower}${upper}${digit}`; // No special character

  // Test that login with invalid password (no special char) fails with 400 error
  await TestValidator.error(
    "login should fail with 400 Bad Request when password has no special character",
    async () => {
      await api.functional.auth.moderator.login(connection, {
        body: {
          email: moderatorEmail,
          password: password,
        } satisfies ICommunityBBSModerator.ILogin,
      });
    },
  );
}
