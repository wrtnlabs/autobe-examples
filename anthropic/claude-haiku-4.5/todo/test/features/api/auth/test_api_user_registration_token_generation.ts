import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ITodoListTokenBlacklist } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTokenBlacklist";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

export async function test_api_user_registration_token_generation(
  connection: api.IConnection,
) {
  // Generate test user credentials with valid formats
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(12); // Minimum 8 characters for security

  // Step 1: Register new user and receive JWT tokens
  const registrationData = {
    email: email,
    password: password,
    href: "https://localhost:3000/auth/register",
    referrer: "https://localhost:3000/",
    ip: "127.0.0.1",
    user_agent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
  } satisfies ITodoListUser.ICreate;

  const authorizedUser: ITodoListUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: registrationData,
    });

  // Step 2: Validate response structure and tokens exist
  typia.assert(authorizedUser);
  TestValidator.predicate(
    "response should contain user information",
    authorizedUser.id !== undefined && authorizedUser.email !== undefined,
  );

  // Step 3: Validate token structure and expiration times
  TestValidator.predicate(
    "access token should be non-empty string",
    authorizedUser.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token should be non-empty string",
    authorizedUser.token.refresh.length > 0,
  );

  // Step 4: Validate token expiration timestamps exist and are valid ISO 8601 format
  TestValidator.predicate(
    "expired_at should be valid ISO 8601 format",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(
      authorizedUser.token.expired_at,
    ),
  );
  TestValidator.predicate(
    "refreshable_until should be valid ISO 8601 format",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(
      authorizedUser.token.refreshable_until,
    ),
  );

  // Step 5: Validate token expiration durations
  const now = new Date();
  const accessTokenExpiry = new Date(authorizedUser.token.expired_at);
  const refreshTokenExpiry = new Date(authorizedUser.token.refreshable_until);

  // Access token should expire within 15-30 minutes
  const accessTokenExpireMinutes =
    (accessTokenExpiry.getTime() - now.getTime()) / (1000 * 60);
  TestValidator.predicate(
    "access token should expire in approximately 15 minutes",
    accessTokenExpireMinutes > 10 && accessTokenExpireMinutes < 20,
  );

  // Refresh token should expire in approximately 7 days
  const refreshTokenExpireDays =
    (refreshTokenExpiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
  TestValidator.predicate(
    "refresh token should expire in approximately 7 days",
    refreshTokenExpireDays > 6.5 && refreshTokenExpireDays < 7.5,
  );

  // Step 6: Validate refresh token expiration is longer than access token expiration
  TestValidator.predicate(
    "refresh token expiration should be much longer than access token expiration",
    refreshTokenExpiry.getTime() > accessTokenExpiry.getTime() + 60 * 60 * 1000, // At least 1 hour difference
  );

  // Step 7: Validate user data matches registration input
  TestValidator.equals(
    "registered email should match input email",
    authorizedUser.email,
    email,
  );

  // Step 8: Validate user timestamps are properly set
  TestValidator.predicate(
    "created_at should be valid ISO 8601 format",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(authorizedUser.created_at),
  );
  TestValidator.predicate(
    "updated_at should be valid ISO 8601 format",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(authorizedUser.updated_at),
  );

  // Step 9: Verify soft-delete status is inactive (null) for new user
  TestValidator.equals(
    "new user should not be soft-deleted",
    authorizedUser.deleted_at,
    null,
  );
}
