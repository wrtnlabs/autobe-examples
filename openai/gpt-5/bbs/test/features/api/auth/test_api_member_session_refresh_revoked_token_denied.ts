import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconDiscussMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussMember";

/**
 * Deny refresh after global logout (revoked refresh token).
 *
 * This test verifies that when a member performs a global logout, any
 * previously issued refresh token becomes invalid and cannot be used to mint
 * new tokens.
 *
 * Steps:
 *
 * 1. Join as a new member to obtain access/refresh tokens.
 * 2. Call logoutAll to revoke active sessions.
 * 3. Attempt to refresh using the previously issued refresh token.
 * 4. Validate that the refresh attempt fails (error thrown).
 *
 * Business rules validated:
 *
 * - Global logout invalidates refresh tokens across devices.
 * - Refresh must fail once sessions are revoked.
 */
export async function test_api_member_session_refresh_revoked_token_denied(
  connection: api.IConnection,
) {
  // 1) Join to obtain tokens
  const email: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const password: string = RandomGenerator.alphaNumeric(12);
  const displayName: string = RandomGenerator.name(1);

  const authorized = await api.functional.auth.member.join(connection, {
    body: {
      email,
      password,
      display_name: displayName,
      timezone: "Asia/Seoul",
      locale: "en-US",
    } satisfies IEconDiscussMember.ICreate,
  });
  typia.assert(authorized);

  const refreshToken: string = authorized.token.refresh;

  // 2) Revoke all sessions (global logout)
  await api.functional.auth.member.logoutAll(connection);

  // 3) Try to refresh using the (now revoked) previous refresh token
  // 4) Validate denial: must throw an error (no status code assertion)
  await TestValidator.error(
    "refresh must fail after global logout with revoked refresh token",
    async () => {
      await api.functional.auth.member.refresh(connection, {
        body: {
          refresh_token: refreshToken,
        } satisfies IEconDiscussMember.IRefresh,
      });
    },
  );
}
