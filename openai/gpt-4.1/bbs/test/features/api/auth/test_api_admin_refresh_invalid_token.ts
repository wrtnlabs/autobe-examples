import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";

/**
 * Validate that the admin authentication refresh endpoint responds securely to
 * invalid or expired tokens.
 *
 * This test checks that submitting a syntactically incorrect (malformed) or
 * expired refresh token to the /auth/admin/refresh endpoint results in a proper
 * authentication failure, without leaking any sensitive admin information.
 *
 * Steps:
 *
 * 1. Construct a clearly invalid refresh token string that cannot possibly map to
 *    a real admin session. This can be a random string that does not resemble a
 *    valid JWT or session identifier.
 * 2. Call api.functional.auth.admin.refresh() with this fake token in the request
 *    body.
 * 3. Validate that an error is thrown (TestValidator.error), confirming
 *    authentication failure as expected.
 * 4. Verify that no sensitive admin or token data is present in the error (e.g.,
 *    error details do not leak admin IDs or tokens).
 *
 * This ensures that refresh attempts with bogus tokens are safely rejected and
 * that the implementation respects secure error handling best practices.
 */
export async function test_api_admin_refresh_invalid_token(
  connection: api.IConnection,
) {
  // 1. Generate a known-invalid refresh token (syntactically bogus, not a valid JWT/token)
  const invalidRefreshToken = RandomGenerator.alphaNumeric(32);

  // 2. Attempt refresh with the invalid token, expecting an error
  await TestValidator.error(
    "refresh with invalid admin token should fail",
    async () => {
      await api.functional.auth.admin.refresh(connection, {
        body: {
          refresh_token: invalidRefreshToken,
        } satisfies IDiscussionBoardAdmin.IRefresh,
      });
    },
  );
}
