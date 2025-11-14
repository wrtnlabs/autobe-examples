import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPoliticalForumModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticalForumModerator";

export async function test_api_moderator_refresh_endpoint_health_check(
  connection: api.IConnection,
) {
  // Generate a valid refresh token for testing
  const refreshToken =
    "refresh_" + typia.random<string & tags.Format<"uuid">>();

  // Call the /auth/moderator/refresh endpoint to exchange the refresh token for a new access token
  const response: IPoliticalForumModerator.IAuthorized =
    await api.functional.auth.moderator.refresh(connection, {
      body: {
        refresh_token: refreshToken,
      } satisfies IPoliticalForumModerator.IRefresh,
    });

  // Validate the response structure and types
  typia.assert(response);

  // Verify that the response contains the expected properties
  TestValidator.equals("response has id", typeof response.id, "string");
  TestValidator.equals("response has email", typeof response.email, "string");
  TestValidator.predicate(
    "email is valid format",
    /^[^@]+@[^@]+\.[^@]+$/i.test(response.email),
  );
  TestValidator.equals("response has token", typeof response.token, "object");

  // Validate token structure
  TestValidator.equals(
    "token has access",
    typeof response.token.access,
    "string",
  );
  TestValidator.equals(
    "token has refresh",
    typeof response.token.refresh,
    "string",
  );
  TestValidator.equals(
    "token has expired_at",
    typeof response.token.expired_at,
    "string",
  );
  TestValidator.equals(
    "token has refreshable_until",
    typeof response.token.refreshable_until,
    "string",
  );

  // Validate date-time formats
  TestValidator.predicate(
    "expired_at is date-time format",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/.test(
      response.token.expired_at,
    ),
  );
  TestValidator.predicate(
    "refreshable_until is date-time format",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/.test(
      response.token.refreshable_until,
    ),
  );
}
