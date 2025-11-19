import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Test token refresh rejection with invalid refresh token.
 *
 * This test validates that the moderator token refresh endpoint properly
 * rejects refresh requests when provided with invalid, malformed, expired, or
 * non-existent refresh tokens. The system must validate the token against the
 * discussion_board_moderator_sessions table and return an authentication error
 * without issuing new tokens. This security test ensures that invalid or
 * expired refresh tokens cannot be used to gain unauthorized access to the
 * system.
 *
 * Test steps:
 *
 * 1. Create an invalid/malformed refresh token string
 * 2. Attempt to call the refresh endpoint with the invalid token
 * 3. Verify the system returns an authentication error
 * 4. Confirm no new access token is issued
 * 5. Verify the connection is not authenticated after the failure
 */
export async function test_api_moderator_token_refresh_invalid_token(
  connection: api.IConnection,
) {
  // Step 1: Test with a completely malformed refresh token
  const malformedToken = "not-a-valid-token-at-all";

  await TestValidator.error(
    "invalid malformed refresh token should be rejected",
    async () => {
      await api.functional.auth.moderator.refresh(connection, {
        body: {
          refresh_token: malformedToken,
        } satisfies IDiscussionBoardModerator.IRefresh,
      });
    },
  );

  // Step 2: Test with an empty refresh token
  const emptyToken = "";

  await TestValidator.error(
    "empty refresh token should be rejected",
    async () => {
      await api.functional.auth.moderator.refresh(connection, {
        body: {
          refresh_token: emptyToken,
        } satisfies IDiscussionBoardModerator.IRefresh,
      });
    },
  );

  // Step 3: Test with a valid-looking but non-existent UUID token
  const nonExistentToken = typia.random<string & tags.Format<"uuid">>();

  await TestValidator.error(
    "non-existent refresh token should be rejected",
    async () => {
      await api.functional.auth.moderator.refresh(connection, {
        body: {
          refresh_token: nonExistentToken,
        } satisfies IDiscussionBoardModerator.IRefresh,
      });
    },
  );

  // Step 4: Test with a random alphanumeric string that looks like a token
  const fakeAlphanumericToken = RandomGenerator.alphaNumeric(64);

  await TestValidator.error(
    "fake alphanumeric token should be rejected",
    async () => {
      await api.functional.auth.moderator.refresh(connection, {
        body: {
          refresh_token: fakeAlphanumericToken,
        } satisfies IDiscussionBoardModerator.IRefresh,
      });
    },
  );

  // Step 5: Verify that the connection is still not authenticated
  // (no valid token was issued despite the refresh attempts)
  TestValidator.predicate(
    "connection should remain unauthenticated after invalid refresh attempts",
    !connection.headers?.Authorization ||
      connection.headers.Authorization === undefined,
  );
}
