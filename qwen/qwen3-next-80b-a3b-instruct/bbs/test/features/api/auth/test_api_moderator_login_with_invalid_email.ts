import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPoliticalForumModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticalForumModerator";

export async function test_api_moderator_login_with_invalid_email(
  connection: api.IConnection,
) {
  // Generate a random email address that is highly unlikely to exist in the system
  const invalidEmail: string = typia.random<string & tags.Format<"email">>();
  const invalidPassword: string = RandomGenerator.alphaNumeric(16);

  // Construct the login credential string in "email:password" format as required by IPoliticalForumModerator.ILogin
  const credentialString = `${invalidEmail}:${invalidPassword}`;

  // Attempt to login with non-existent moderator credentials
  await TestValidator.error(
    "login with invalid email should return 401 Unauthorized",
    async () => {
      await api.functional.auth.moderator.login(connection, {
        body: credentialString satisfies IPoliticalForumModerator.ILogin,
      });
    },
  );
}
