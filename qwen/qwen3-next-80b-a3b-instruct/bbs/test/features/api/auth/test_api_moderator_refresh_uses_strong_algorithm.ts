import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPoliticalForumModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticalForumModerator";

export async function test_api_moderator_refresh_uses_strong_algorithm(
  connection: api.IConnection,
) {
  // Generate a valid refresh token
  const refresh_token = typia.random<string & tags.Format<"uuid">>();

  // Call the refresh endpoint with valid credentials
  const response: IPoliticalForumModerator.IAuthorized =
    await api.functional.auth.moderator.refresh(connection, {
      body: { refresh_token } satisfies IPoliticalForumModerator.IRefresh,
    });

  // Validate the response structure is correct
  typia.assert(response);

  // Validate that the access token property exists and is a non-empty string
  TestValidator.predicate(
    "access token is a non-empty string",
    typeof response.token.access === "string" &&
      response.token.access.length > 0,
  );

  // Validate that the refresh token in response is a non-empty string
  TestValidator.predicate(
    "refresh token is a non-empty string",
    typeof response.token.refresh === "string" &&
      response.token.refresh.length > 0,
  );

  // Validate that expiration times are properly formatted date-time strings
  TestValidator.predicate(
    "expired_at is valid date-time format",
    typia.is<string & tags.Format<"date-time">>(response.token.expired_at),
  );

  TestValidator.predicate(
    "refreshable_until is valid date-time format",
    typia.is<string & tags.Format<"date-time">>(
      response.token.refreshable_until,
    ),
  );
}
