import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

/**
 * Test token refresh rejection with invalid refresh token.
 *
 * Validates error handling when a member attempts to refresh their access token
 * using an invalid refresh token. The invalid token could be malformed,
 * tampered with, fabricated, in non-UUID format, or a token that doesn't exist
 * in the discussion_board_member_sessions table. The system must reject refresh
 * requests with an 'Invalid refresh token' error message and deny access.
 *
 * This test ensures the refresh token mechanism properly validates token
 * integrity and existence, preventing attackers from using forged or expired
 * tokens to gain unauthorized access.
 *
 * Test scenarios covered:
 *
 * 1. Non-existent token (valid format but not in database)
 * 2. Malformed token (invalid structure)
 * 3. Empty token string
 * 4. Random string token
 */
export async function test_api_member_token_refresh_invalid_token(
  connection: api.IConnection,
) {
  // Test with non-existent UUID token (valid format but not in database)
  const nonExistentToken = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "invalid non-existent refresh token should fail",
    async () => {
      await api.functional.auth.member.refresh(connection, {
        body: {
          refresh_token: nonExistentToken,
        } satisfies IDiscussionBoardMember.IRefreshRequest,
      });
    },
  );

  // Test with malformed token (invalid structure)
  const malformedToken = "not-a-valid-token-format";
  await TestValidator.error("malformed refresh token should fail", async () => {
    await api.functional.auth.member.refresh(connection, {
      body: {
        refresh_token: malformedToken,
      } satisfies IDiscussionBoardMember.IRefreshRequest,
    });
  });

  // Test with empty token string
  const emptyToken = "";
  await TestValidator.error("empty refresh token should fail", async () => {
    await api.functional.auth.member.refresh(connection, {
      body: {
        refresh_token: emptyToken,
      } satisfies IDiscussionBoardMember.IRefreshRequest,
    });
  });

  // Test with random alphanumeric token
  const randomToken = RandomGenerator.alphaNumeric(32);
  await TestValidator.error(
    "random alphanumeric refresh token should fail",
    async () => {
      await api.functional.auth.member.refresh(connection, {
        body: {
          refresh_token: randomToken,
        } satisfies IDiscussionBoardMember.IRefreshRequest,
      });
    },
  );

  // Test with tampered token (partial UUID modification)
  const tamperedToken = "00000000-0000-0000-0000-000000000000";
  await TestValidator.error(
    "tampered/invalid refresh token should fail",
    async () => {
      await api.functional.auth.member.refresh(connection, {
        body: {
          refresh_token: tamperedToken,
        } satisfies IDiscussionBoardMember.IRefreshRequest,
      });
    },
  );
}
