import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityBBSModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBBSModerator";

export async function test_api_moderator_login_password_contains_email(
  connection: api.IConnection,
) {
  // Generate a valid moderator email
  const moderatorEmail = typia.random<string & tags.Format<"email">>();

  // Create a password that contains the moderator's email address (violating policy)
  const passwordWithEmail = `myPassword${moderatorEmail}`;

  // Attempt to login with password containing email (should fail with 400)
  await TestValidator.error(
    "moderator login should fail when password contains email",
    async () => {
      await api.functional.auth.moderator.login(connection, {
        body: {
          email: moderatorEmail,
          password: passwordWithEmail,
        } satisfies ICommunityBBSModerator.ILogin,
      });
    },
  );
}
