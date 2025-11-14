import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPoliticalForumModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticalForumModerator";

export async function test_api_moderator_login_hash_algorithm_migration(
  connection: api.IConnection,
) {
  // Generate a realistic moderator email
  const email = typia.random<string & tags.Format<"email">>();

  // Submit the email string as ILogin per the schema definition
  const loginResponse: IPoliticalForumModerator.IAuthorized =
    await api.functional.auth.moderator.login(connection, {
      body: email,
    });

  // Assert successful authentication and response structure
  typia.assert(loginResponse);

  // Validate response contains correct fields
  TestValidator.equals(
    "moderator id is valid UUID",
    typeof loginResponse.id,
    "string",
  );
  TestValidator.equals("moderator email matches", loginResponse.email, email);
  TestValidator.equals(
    "token access is string",
    typeof loginResponse.token.access,
    "string",
  );
  TestValidator.equals(
    "token refresh is string",
    typeof loginResponse.token.refresh,
    "string",
  );
  TestValidator.equals(
    "token expired_at is ISO date-time",
    typeof loginResponse.token.expired_at,
    "string",
  );
  TestValidator.equals(
    "token refreshable_until is ISO date-time",
    typeof loginResponse.token.refreshable_until,
    "string",
  );
}
