import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPoliticalForumModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticalForumModerator";

export async function test_api_moderator_login_profiles_not_exposed(
  connection: api.IConnection,
) {
  // Generate valid moderator login credentials
  const loginCredentials = typia.random<IPoliticalForumModerator.ILogin>();

  // Execute moderator login
  const loginResponse: IPoliticalForumModerator.IAuthorized =
    await api.functional.auth.moderator.login(connection, {
      body: loginCredentials,
    });

  // Validate that the response strictly conforms to IAuthorized schema
  // IAuthorized only contains id, email, and token - no profile information
  typia.assert(loginResponse);
}
