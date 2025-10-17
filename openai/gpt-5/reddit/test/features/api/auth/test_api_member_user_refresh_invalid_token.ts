import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformMemberUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberUser";

export async function test_api_member_user_refresh_invalid_token(
  connection: api.IConnection,
) {
  /**
   * Validate that POST /auth/memberUser/refresh rejects invalid refresh tokens.
   *
   * Business context:
   *
   * - Clients use this endpoint to exchange a refresh token for new
   *   access/refresh tokens.
   * - When a refresh token is invalid, malformed, or expired, the server must
   *   reject the request.
   *
   * What this test covers:
   *
   * 1. Malformed token string (clearly not a JWT-like format) is rejected.
   * 2. Opaque random token (well-formed string but not valid) is rejected.
   *
   * Notes:
   *
   * - We do not verify specific HTTP status codes or error payloads; only that an
   *   error occurs.
   * - We never manipulate connection.headers; SDK handles auth headers internally
   *   on success.
   */

  // 1) Malformed token (clearly not a JWT)
  await TestValidator.error(
    "refresh rejects malformed token string",
    async () => {
      await api.functional.auth.memberUser.refresh(connection, {
        body: {
          refresh_token: "not-a-jwt",
        } satisfies ICommunityPlatformMemberUser.IRefresh,
      });
    },
  );

  // 2) Random opaque token (long alphanumeric string) that should be invalid
  const randomOpaque = RandomGenerator.alphaNumeric(64);
  await TestValidator.error("refresh rejects random opaque token", async () => {
    await api.functional.auth.memberUser.refresh(connection, {
      body: {
        refresh_token: randomOpaque,
      } satisfies ICommunityPlatformMemberUser.IRefresh,
    });
  });
}
