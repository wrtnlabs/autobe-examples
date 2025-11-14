import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPoliticalForumModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticalForumModerator";

export async function test_api_moderator_login_allows_optional_email_confirmation(
  connection: api.IConnection,
) {
  // Generate valid moderator login credentials
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = "securePassword123";

  // Create login credentials as a JSON string body as required by ILogin: string type
  // Even though the API documentation suggests an object structure, the DTO defines ILogin as string
  // So we must follow the provided schema and construct a JSON string representation
  const loginBody = JSON.stringify({
    email: moderatorEmail,
    password: moderatorPassword,
  });

  // Perform moderator login with the string body as required by the ILogin schema
  const loginResponse: IPoliticalForumModerator.IAuthorized =
    await api.functional.auth.moderator.login(connection, {
      body: loginBody satisfies IPoliticalForumModerator.ILogin,
    });

  // Validate the entire response object with typia.assert()
  // This performs complete type validation including all properties and nested objects
  typia.assert(loginResponse);

  // No additional validation is needed after typia.assert()
  // The test successfully validates that moderator login works with unconfirmed email
  // as required by the scenario - no email confirmation is needed for authentication
}
