import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicDiscussionModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionModerator";

export async function test_api_moderator_login_success(
  connection: api.IConnection,
) {
  // Generate valid moderator login credentials with proper constraints
  const moderatorLogin: IEconomicDiscussionModerator.ILogin = {
    username: RandomGenerator.alphaNumeric(10),
    password: RandomGenerator.alphaNumeric(15),
    ip: typia.random<string & tags.Format<"ipv4">>(),
    href: "https://ediscussion.example.com/login",
    referrer: "https://ediscussion.example.com/home",
  } satisfies IEconomicDiscussionModerator.ILogin;

  // Perform moderator login authentication
  const response: IEconomicDiscussionModerator.IAuthorized =
    await api.functional.auth.moderator.login(connection, {
      body: moderatorLogin,
    });

  // Validate response structure and moderator profile data
  typia.assert(response);

  // Verify authentication token is properly set
  TestValidator.predicate(
    "Authentication token exists",
    response.token?.access.length > 0,
  );
  TestValidator.predicate(
    "Refresh token exists",
    response.token?.refresh.length > 0,
  );
  TestValidator.predicate(
    "Token expiration set",
    response.token?.expired_at.length > 0,
  );
  TestValidator.predicate(
    "Token refreshable until set",
    response.token?.refreshable_until.length > 0,
  );

  // Validate moderator profile information
  TestValidator.predicate(
    "Moderator ID is valid UUID",
    typia.is<string & tags.Format<"uuid">>(response.id),
  );
  TestValidator.predicate(
    "Username matches input",
    response.username === moderatorLogin.username,
  );
  TestValidator.predicate(
    "Email follows proper format",
    typia.is<string & tags.Format<"email">>(response.email),
  );
  TestValidator.predicate(
    "Email verification status is boolean",
    typeof response.email_verified === "boolean",
  );
  TestValidator.predicate(
    "2FA status is boolean",
    typeof response.two_factor_enabled === "boolean",
  );
  TestValidator.predicate(
    "Moderation level is string",
    typeof response.moderation_level === "string",
  );
  TestValidator.predicate(
    "Created at timestamp formatted correctly",
    typia.is<string & tags.Format<"date-time">>(response.created_at),
  );
  TestValidator.predicate(
    "Updated at timestamp formatted correctly",
    typia.is<string & tags.Format<"date-time">>(response.updated_at),
  );

  // Verify connection headers are updated with authorization
  TestValidator.predicate(
    "Authorization header set",
    connection.headers?.Authorization === response.token.access,
  );
}
