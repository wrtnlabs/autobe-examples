import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPortalMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPortalMember";

/**
 * Validate refresh token rejection after member account soft-deletion.
 *
 * Business context:
 *
 * - When a member is removed (soft-delete), previously issued refresh tokens must
 *   not be usable to obtain new access tokens. This preserves security by
 *   preventing reactivation via long-lived credentials tied to removed
 *   accounts.
 *
 * Test steps:
 *
 * 1. Register a new member via POST /auth/member/join and capture the returned
 *    authorization payload including refresh token and user id.
 * 2. Soft-delete the created member via DELETE
 *    /communityPortal/member/users/{userId} while authenticated as that member
 *    (the SDK sets Authorization on join).
 * 3. Attempt to refresh using the previously captured refresh token and assert the
 *    call is rejected (HTTP 401 or 403).
 *
 * Notes:
 *
 * - If the environment enforces admin-only deletion, this test will fail; the
 *   test documents this and attempts owner-initiated deletion as the primary
 *   path.
 */
export async function test_api_member_refresh_after_account_deletion(
  connection: api.IConnection,
) {
  // 1) Register a new member and capture tokens
  const username = RandomGenerator.alphaNumeric(8);
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(12);

  const joinBody = {
    username,
    email,
    password,
    display_name: RandomGenerator.name(),
  } satisfies ICommunityPortalMember.ICreate;

  const authorized: ICommunityPortalMember.IAuthorized =
    await api.functional.auth.member.join(connection, { body: joinBody });
  typia.assert(authorized);

  const { id: createdUserId } = authorized;
  const refreshToken = authorized.token.refresh;

  // 2) Soft-delete the created member using the same connection (authenticated)
  await api.functional.communityPortal.member.users.erase(connection, {
    userId: createdUserId,
  });

  // 3) Attempt to refresh using the previously captured refresh token.
  // Use an unauthenticated connection copy to avoid any Authorization header
  // influence on the refresh endpoint behavior.
  const unauthConn: api.IConnection = { ...connection, headers: {} };

  const refreshBody = {
    refreshToken,
  } satisfies ICommunityPortalMember.IRefresh;

  // Expect the refresh attempt to be rejected. The server may return 401 or 403
  // depending on policy; accept either.
  await TestValidator.httpError(
    "refresh after deletion should be rejected",
    [401, 403],
    async () => {
      await api.functional.auth.member.refresh(unauthConn, {
        body: refreshBody,
      });
    },
  );
}
