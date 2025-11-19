import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

export async function test_api_moderator_authentication_email_not_verified(
  connection: api.IConnection,
) {
  // Generate moderator credentials with password meeting complexity requirements
  const email = typia.random<string & tags.Format<"email">>();
  const password = "TestPass123!"; // 8+ chars, uppercase, lowercase, number, special char

  // Prepare login request with session context
  const loginBody = {
    email: email,
    password: password,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardModerator.ILogin;

  // Attempt to login with unverified email
  // The API should reject this login attempt because email_verified is false
  await TestValidator.error(
    "unverified email moderator login should fail",
    async () => {
      await api.functional.auth.moderator.login(connection, {
        body: loginBody,
      });
    },
  );

  // Verify no token was issued by checking that connection headers remain empty
  typia.assert(connection.headers);
}
