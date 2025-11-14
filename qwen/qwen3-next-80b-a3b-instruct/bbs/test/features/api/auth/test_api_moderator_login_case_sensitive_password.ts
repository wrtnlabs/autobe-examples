import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPoliticalForumModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticalForumModerator";

export async function test_api_moderator_login_case_sensitive_password(
  connection: api.IConnection,
) {
  // Define case-sensitive password for testing
  const correctPassword: string = "Password123";
  const incorrectPassword: string = "password123";

  // First attempt: Correct case password should succeed
  const correctLogin: IPoliticalForumModerator.IAuthorized =
    await api.functional.auth.moderator.login(connection, {
      body: correctPassword, // ILogin is string type
    });
  typia.assert(correctLogin); // Validate full IAuthorized response type
  TestValidator.predicate("returned email is in valid email format", () =>
    typia.is<string & tags.Format<"email">>(correctLogin.email),
  );

  // Reset connection state to isolate test of incorrect password
  const newConnection: api.IConnection = { ...connection, headers: {} };

  // Second attempt: Incorrect case password should fail
  await TestValidator.error(
    "incorrect case password should fail authentication",
    async () => {
      await api.functional.auth.moderator.login(newConnection, {
        body: incorrectPassword,
      });
    },
  );
}
