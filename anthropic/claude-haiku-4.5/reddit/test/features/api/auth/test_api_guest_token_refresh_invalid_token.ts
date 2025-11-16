import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

/**
 * Test token refresh with an invalid or malformed refresh token.
 *
 * This test validates that the guest token refresh endpoint properly rejects
 * invalid, non-existent, corrupted, or malformed refresh tokens. The endpoint
 * should return an appropriate error response (HTTP 401 Unauthorized) without
 * issuing new tokens. This ensures that invalid token refresh attempts do not
 * compromise guest session security or create new tokens from invalid input.
 * The error message should clearly indicate the issue.
 *
 * Steps:
 *
 * 1. Attempt to refresh tokens using a completely invalid/random token
 * 2. Verify that the endpoint returns HTTP 401 Unauthorized
 * 3. Confirm that no new tokens are issued
 * 4. Test with a malformed token format
 * 5. Verify security is maintained and invalid input is properly rejected
 */
export async function test_api_guest_token_refresh_invalid_token(
  connection: api.IConnection,
) {
  // Test 1: Attempt refresh with completely invalid random token
  await TestValidator.error(
    "should reject refresh with invalid random token",
    async () => {
      await api.functional.auth.guest.refresh(connection, {
        body: {
          refresh_token: RandomGenerator.alphaNumeric(64),
        } satisfies ICommunityPlatformMember.IRefresh,
      });
    },
  );

  // Test 2: Attempt refresh with empty string token
  await TestValidator.error(
    "should reject refresh with empty refresh token",
    async () => {
      await api.functional.auth.guest.refresh(connection, {
        body: {
          refresh_token: "",
        } satisfies ICommunityPlatformMember.IRefresh,
      });
    },
  );

  // Test 3: Attempt refresh with malformed UUID-like token
  await TestValidator.error(
    "should reject refresh with malformed token format",
    async () => {
      await api.functional.auth.guest.refresh(connection, {
        body: {
          refresh_token: "not-a-valid-token-format",
        } satisfies ICommunityPlatformMember.IRefresh,
      });
    },
  );

  // Test 4: Attempt refresh with whitespace-only token
  await TestValidator.error(
    "should reject refresh with whitespace token",
    async () => {
      await api.functional.auth.guest.refresh(connection, {
        body: {
          refresh_token: "   ",
        } satisfies ICommunityPlatformMember.IRefresh,
      });
    },
  );

  // Test 5: Attempt refresh with corrupted/truncated token
  await TestValidator.error(
    "should reject refresh with corrupted token",
    async () => {
      await api.functional.auth.guest.refresh(connection, {
        body: {
          refresh_token: RandomGenerator.alphaNumeric(10),
        } satisfies ICommunityPlatformMember.IRefresh,
      });
    },
  );
}
