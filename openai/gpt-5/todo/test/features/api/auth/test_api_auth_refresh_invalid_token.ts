import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoUser";

/**
 * Validate that refresh is denied when an invalid or malformed refresh token is
 * presented.
 *
 * Business goals:
 *
 * - When a client presents an unusable refresh token (invalid/malformed), the
 *   system must deny issuing new access credentials without leaking
 *   security-sensitive details.
 * - No authenticated context must be created on denial.
 *
 * Notes:
 *
 * - This test uses only POST /auth/user/refresh. No additional protected
 *   endpoints are provided to validate access with a token, so denial is
 *   asserted by expecting an error from the refresh call itself.
 * - The SDK's simulation mode always returns mocked data on valid types.
 *   Therefore, when in simulate mode, we assert the mocked success response
 *   type and skip denial assertions.
 */
export async function test_api_auth_refresh_invalid_token(
  connection: api.IConnection,
) {
  // Use an isolated connection so we never touch or depend on shared headers.
  const unauthConn: api.IConnection = { ...connection, headers: {} };

  // Prepare obviously invalid and malformed refresh tokens.
  const invalidJwtLike: string = `invalid.${RandomGenerator.alphaNumeric(32)}.${RandomGenerator.alphaNumeric(16)}`;
  const emptyToken: string = "";

  const invalidBody = {
    refresh_token: invalidJwtLike,
  } satisfies ITodoUser.IRefresh;
  const emptyBody = { refresh_token: emptyToken } satisfies ITodoUser.IRefresh;

  // In simulation mode, the SDK returns mock success; validate and exit.
  if (unauthConn.simulate === true) {
    const mocked: ITodoUser.IAuthorized =
      await api.functional.auth.user.refresh(unauthConn, { body: invalidBody });
    typia.assert(mocked);
    return;
  }

  // Real server path: invalid token should be rejected.
  await TestValidator.error(
    "refresh with an invalid token must be rejected",
    async () => {
      await api.functional.auth.user.refresh(unauthConn, { body: invalidBody });
    },
  );

  // Also verify a clearly malformed token (empty string) is rejected.
  await TestValidator.error(
    "refresh with an empty token must be rejected",
    async () => {
      await api.functional.auth.user.refresh(unauthConn, { body: emptyBody });
    },
  );
}
