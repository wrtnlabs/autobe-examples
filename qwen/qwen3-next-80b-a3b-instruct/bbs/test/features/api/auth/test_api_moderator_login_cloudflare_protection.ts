import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPoliticalForumModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticalForumModerator";

export async function test_api_moderator_login_cloudflare_protection(
  connection: api.IConnection,
) {
  const moderatorLogin: IPoliticalForumModerator.ILogin =
    typia.random<IPoliticalForumModerator.ILogin>();

  const response: IPoliticalForumModerator.IAuthorized =
    await api.functional.auth.moderator.login(connection, {
      body: moderatorLogin,
    });
  typia.assert(response);

  // Validate token properties
  TestValidator.equals(
    "access token exists and is string",
    typeof response.token.access,
    "string",
  );
  TestValidator.equals(
    "refresh token exists and is string",
    typeof response.token.refresh,
    "string",
  );
  TestValidator.equals(
    "expired_at is ISO date-time string",
    typeof response.token.expired_at,
    "string",
  );
  TestValidator.equals(
    "refreshable_until is ISO date-time string",
    typeof response.token.refreshable_until,
    "string",
  );

  // Validate that the moderator successfully authenticated with JWT token
  typia.assert<IAuthorizationToken>(response.token);

  // Validate moderator identity
  TestValidator.equals(
    "moderator ID is valid UUID",
    typeof response.id,
    "string",
  );
  TestValidator.equals(
    "moderator email is valid email",
    typeof response.email,
    "string",
  );

  // Validate that the response structure matches the expected authorized response
  typia.assert<IPoliticalForumModerator.IAuthorized>(response);
}
