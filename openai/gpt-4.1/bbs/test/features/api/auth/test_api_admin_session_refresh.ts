import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";

/**
 * Validates admin session refresh endpoint: ensures sessions are properly
 * refreshed with valid tokens and rejected with invalid tokens.
 *
 * 1. Register a new admin and complete email verification (assumed finalized).
 * 2. Use join response to extract both access and refresh tokens.
 * 3. Send a refresh request using the valid refresh token, check that a new access
 *    & refresh token are returned, and the session remains active.
 * 4. Try to refresh with an invalid/expired/revoked token and expect failure with
 *    error.
 */
export async function test_api_admin_session_refresh(
  connection: api.IConnection,
) {
  // 1. Register new admin
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminUsername: string = RandomGenerator.name();
  const adminPassword: string = typia.random<
    string & tags.Format<"password">
  >();
  const joinAdmin: IDiscussionBoardAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        username: adminUsername,
        password: adminPassword,
      } satisfies IDiscussionBoardAdmin.ICreate,
    });
  typia.assert(joinAdmin);
  TestValidator.equals(
    "registered admin email matches input",
    joinAdmin.email,
    adminEmail,
  );
  TestValidator.equals(
    "registered admin username matches input",
    joinAdmin.username,
    adminUsername,
  );
  TestValidator.predicate(
    "admin email_verified should be true after finalized onboarding",
    joinAdmin.email_verified === true,
  );

  // 2. Extract current refresh token
  const originalAccessToken: string = joinAdmin.token.access;
  const refreshToken: string = joinAdmin.token.refresh;

  // 3. Perform session refresh with valid refresh token
  const refreshed: IDiscussionBoardAdmin.IAuthorized =
    await api.functional.auth.admin.refresh(connection, {
      body: { refreshToken } satisfies IDiscussionBoardAdmin.IRefresh,
    });
  typia.assert(refreshed);
  TestValidator.predicate(
    "refresh returned a new access token",
    typeof refreshed.token.access === "string" &&
      refreshed.token.access.length > 0 &&
      refreshed.token.access !== originalAccessToken,
  );
  TestValidator.predicate(
    "refresh returned a new refresh token",
    typeof refreshed.token.refresh === "string" &&
      refreshed.token.refresh.length > 0 &&
      refreshed.token.refresh !== refreshToken,
  );
  TestValidator.equals(
    "admin ID remains unchanged after refresh",
    refreshed.id,
    joinAdmin.id,
  );
  TestValidator.equals(
    "admin email remains unchanged after refresh",
    refreshed.email,
    adminEmail,
  );
  TestValidator.equals(
    "admin username remains unchanged after refresh",
    refreshed.username,
    adminUsername,
  );

  // 4. Attempt refresh with invalid token
  const invalidToken = randomToken();
  await TestValidator.error(
    "refresh with invalid token should fail",
    async () => {
      await api.functional.auth.admin.refresh(connection, {
        body: {
          refreshToken: invalidToken,
        } satisfies IDiscussionBoardAdmin.IRefresh,
      });
    },
  );
}

function randomToken(): string {
  // JWT-like random string: header.payload.signature
  return [0, 1, 2]
    .map(
      () =>
        RandomGenerator.alphaNumeric(8) +
        RandomGenerator.alphaNumeric(16) +
        RandomGenerator.alphaNumeric(12),
    )
    .join(".");
}
