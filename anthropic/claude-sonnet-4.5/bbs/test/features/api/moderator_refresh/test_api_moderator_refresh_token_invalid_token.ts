import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Test token refresh attempt with an invalid or malformed refresh token.
 *
 * This test validates that the system properly rejects refresh attempts when
 * the provided token is not a valid JWT, has an invalid signature, or is
 * otherwise malformed. It verifies appropriate error handling, security
 * measures to prevent token forgery, and that no new tokens are issued.
 *
 * The test ensures the system validates token structure and cryptographic
 * signature before processing the refresh request, which is critical for
 * maintaining authentication security and preventing unauthorized access.
 *
 * Steps:
 *
 * 1. Generate an invalid/malformed refresh token (not a valid JWT)
 * 2. Attempt to refresh tokens using the invalid token
 * 3. Verify that the API properly rejects the request with an error
 * 4. Confirm that no authentication tokens are issued for invalid requests
 */
export async function test_api_moderator_refresh_token_invalid_token(
  connection: api.IConnection,
) {
  // Test with a completely invalid token (random string)
  const invalidToken = RandomGenerator.alphaNumeric(32);

  await TestValidator.error(
    "refresh should fail with invalid token",
    async () => {
      await api.functional.auth.moderator.refresh(connection, {
        body: {
          refresh_token: invalidToken,
        } satisfies IDiscussionBoardModerator.IRefresh,
      });
    },
  );

  // Test with malformed JWT-like structure (invalid format)
  const malformedToken = `${RandomGenerator.alphaNumeric(10)}.${RandomGenerator.alphaNumeric(10)}.invalid_signature`;

  await TestValidator.error(
    "refresh should fail with malformed JWT token",
    async () => {
      await api.functional.auth.moderator.refresh(connection, {
        body: {
          refresh_token: malformedToken,
        } satisfies IDiscussionBoardModerator.IRefresh,
      });
    },
  );

  // Test with empty string token
  await TestValidator.error(
    "refresh should fail with empty token",
    async () => {
      await api.functional.auth.moderator.refresh(connection, {
        body: {
          refresh_token: "",
        } satisfies IDiscussionBoardModerator.IRefresh,
      });
    },
  );
}
