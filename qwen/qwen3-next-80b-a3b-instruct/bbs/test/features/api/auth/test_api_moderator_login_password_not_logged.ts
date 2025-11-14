import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPoliticalForumModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticalForumModerator";

export async function test_api_moderator_login_password_not_logged(
  connection: api.IConnection,
) {
  // Generate a valid moderator login credential with a test password
  const loginCredentials = "test123!" satisfies IPoliticalForumModerator.ILogin;

  // Execute the login request with the test password
  const response: IPoliticalForumModerator.IAuthorized =
    await api.functional.auth.moderator.login(connection, {
      body: loginCredentials,
    });

  // Validate response structure and types with typia.assert()
  // This ensures all properties exist and are correctly typed
  typia.assert(response);
}
