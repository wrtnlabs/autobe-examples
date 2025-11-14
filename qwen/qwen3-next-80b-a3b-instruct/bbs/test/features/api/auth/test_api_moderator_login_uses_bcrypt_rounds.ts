import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPoliticalForumModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticalForumModerator";

export async function test_api_moderator_login_uses_bcrypt_rounds(
  connection: api.IConnection,
) {
  // Generate valid moderator credentials for login
  const email: string = typia.random<string & tags.Format<"email">>();
  const password: string = RandomGenerator.alphaNumeric(16);

  // Construct a JSON string body containing email and password as required by the ILogin type
  const body: string = JSON.stringify({ email, password });

  // Call the login endpoint with valid credentials
  const result: IPoliticalForumModerator.IAuthorized =
    await api.functional.auth.moderator.login(connection, {
      body,
    });

  // Validate that the authentication response is successful and contains expected fields
  typia.assert(result);
  TestValidator.equals("moderator email matches", result.email, email);
  TestValidator.equals(
    "access token exists",
    typeof result.token.access,
    "string",
  );
  TestValidator.equals(
    "refresh token exists",
    typeof result.token.refresh,
    "string",
  );
  TestValidator.equals(
    "expired_at is date-time format",
    typeof result.token.expired_at,
    "string",
  );
  TestValidator.equals(
    "refreshable_until is date-time format",
    typeof result.token.refreshable_until,
    "string",
  );
}
