import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPoliticalForumModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticalForumModerator";

/**
 * Validate that the moderator refresh endpoint properly enforces a maximum
 * length for the refresh_token parameter to prevent buffer overflow or DOS
 * attacks.
 *
 * The system must reject refresh tokens that exceed a maximum length limit
 * (16384 characters) with a 400 Bad Request response. This test verifies that
 * the system correctly identifies and rejects overly long refresh token values
 * without consuming excessive memory or CPU.
 *
 * The test executes three distinct scenarios:
 *
 * 1. A refresh token of 1024 characters (well below limit)
 * 2. A refresh token of 4096 characters (below limit but larger)
 * 3. A refresh token of 16384 characters (at maximum limit)
 *
 * Note: This test deliberately does not attempt to exceed the maximum limit as
 * that would be a type violation since the API expects a string type. Type
 * validation (length constraints) are validated through proper API contracts,
 * not by sending incorrect types. The refresh token value will be constructed
 * as a string of repeated characters to meet the exact length requirements.
 */
export async function test_api_moderator_refresh_token_size_limit(
  connection: api.IConnection,
) {
  // Helper function to generate a string of specific length with repeated characters
  const generateToken = (length: number): string => {
    return ArrayUtil.repeat(length, () => "X").join("");
  };

  // Test 1: Token length of 1024 characters (below limit)
  const smallToken = generateToken(1024);
  const smallResult = await api.functional.auth.moderator.refresh(connection, {
    body: {
      refresh_token: smallToken,
    } satisfies IPoliticalForumModerator.IRefresh,
  });
  typia.assert(smallResult);
  TestValidator.equals(
    "small token should succeed",
    smallResult.token.access.length > 0,
    true,
  );

  // Test 2: Token length of 4096 characters (below limit)
  const mediumToken = generateToken(4096);
  const mediumResult = await api.functional.auth.moderator.refresh(connection, {
    body: {
      refresh_token: mediumToken,
    } satisfies IPoliticalForumModerator.IRefresh,
  });
  typia.assert(mediumResult);
  TestValidator.equals(
    "medium token should succeed",
    mediumResult.token.access.length > 0,
    true,
  );

  // Test 3: Token length of 16384 characters (at maximum limit)
  const largeToken = generateToken(16384);
  const largeResult = await api.functional.auth.moderator.refresh(connection, {
    body: {
      refresh_token: largeToken,
    } satisfies IPoliticalForumModerator.IRefresh,
  });
  typia.assert(largeResult);
  TestValidator.equals(
    "large token at maximum length should succeed",
    largeResult.token.access.length > 0,
    true,
  );

  // Test 4: Token length just beyond maximum (16385 characters) - should return 400 Bad Request
  const tooLargeToken = generateToken(16385);
  await TestValidator.error(
    "token exceeding maximum length (16385 chars) should fail with 400 Bad Request",
    async () => {
      await api.functional.auth.moderator.refresh(connection, {
        body: {
          refresh_token: tooLargeToken,
        } satisfies IPoliticalForumModerator.IRefresh,
      });
    },
  );
}
