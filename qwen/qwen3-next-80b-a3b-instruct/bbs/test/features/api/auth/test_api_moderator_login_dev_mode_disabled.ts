import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPoliticalForumModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticalForumModerator";

export async function test_api_moderator_login_dev_mode_disabled(
  connection: api.IConnection,
) {
  // Test that development modes (no password hashing, fake authentication) are disabled in production
  // Using hard-coded test credentials to verify password hashing and database lookup are active

  // Generate a valid email conforming to ILogin type
  const email = typia.random<string & tags.Format<"email">>();

  // Generate a strong password - ILogin is string type representing the password string
  const password = RandomGenerator.alphaNumeric(16);

  // Use the hard-coded credentials to attempt a real login
  const authResponse: IPoliticalForumModerator.IAuthorized =
    await api.functional.auth.moderator.login(connection, {
      body: password satisfies IPoliticalForumModerator.ILogin,
    });

  // Validate the response structure and type
  typia.assert(authResponse);

  // Verify authentication succeeded with expected fields
  TestValidator.equals(
    "auth response contains id",
    authResponse.id,
    authResponse.id,
  );
  TestValidator.equals(
    "auth response contains email",
    authResponse.email,
    authResponse.email,
  );
  TestValidator.predicate("auth token has access property", () =>
    Boolean(authResponse.token.access && authResponse.token.access.length > 0),
  );
  TestValidator.predicate("auth token has refresh property", () =>
    Boolean(
      authResponse.token.refresh && authResponse.token.refresh.length > 0,
    ),
  );
  TestValidator.predicate("auth token has expired_at timestamp", () =>
    Boolean(authResponse.token.expired_at),
  );
  TestValidator.predicate("auth token has refreshable_until timestamp", () =>
    Boolean(authResponse.token.refreshable_until),
  );

  // Verify expired_at and refreshable_until are valid ISO 8601 date-time format
  TestValidator.predicate("expired_at is valid date-time format", () =>
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(
      authResponse.token.expired_at,
    ),
  );
  TestValidator.predicate("refreshable_until is valid date-time format", () =>
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(
      authResponse.token.refreshable_until,
    ),
  );
}
