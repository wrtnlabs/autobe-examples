import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformMemberuser";

/**
 * Validate that non-admin actors cannot access the platform admin member user
 * search endpoint.
 *
 * Business goal
 *
 * - Ensure that PATCH /communityPlatform/platformAdmin/memberUsers is only
 *   callable by the platformAdmin actor and is rejected for regular member
 *   users and completely unauthenticated clients.
 *
 * Scenario steps
 *
 * 1. Register and auto-login a regular member user via /auth/memberUser/join.
 *
 *    - This sets an Authorization header for the member user on the shared
 *         connection through the SDK implementation.
 * 2. With this member-authenticated connection, attempt to call
 *    communityPlatform.platformAdmin.memberUsers.index with a simple
 *    ICommunityPlatformMemberuser.IRequest body and expect an HTTP
 *    authorization error.
 * 3. Build a new unauthenticated connection (no Authorization header) and call the
 *    same index endpoint again, expecting an HTTP authorization error as well.
 *
 * Note: We intentionally avoid asserting specific HTTP status codes via manual
 * checks; instead we rely on TestValidator.httpError, which is the approved
 * helper for HTTP error expectations.
 */
export async function test_api_platform_admin_search_member_users_unauthorized_access(
  connection: api.IConnection,
) {
  // 1. Arrange: create and auto-authenticate a regular member user.
  //    The join endpoint will set `connection.headers.Authorization` via the
  //    SDK, so subsequent calls on this connection are performed as the
  //    member user.
  const memberJoinBody =
    typia.random<ICommunityPlatformMemberuser.IJoinRequest>();
  await api.functional.auth.memberUser.join(connection, {
    body: memberJoinBody,
  });

  // 2. Act & Assert: member user attempting to access admin-only member search
  //    must result in an HTTP authorization error.
  await TestValidator.httpError(
    "member user cannot access platform admin member user search",
    [401, 403],
    async () => {
      await api.functional.communityPlatform.platformAdmin.memberUsers.index(
        connection,
        {
          body: {
            page: 1,
            limit: 10,
          } satisfies ICommunityPlatformMemberuser.IRequest,
        },
      );
    },
  );

  // 3. Act & Assert: completely unauthenticated client should also be rejected.
  //    This uses the allowed pattern of creating a fresh connection object with
  //    empty headers and performing no further header manipulation.
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  await TestValidator.httpError(
    "unauthenticated client cannot access platform admin member user search",
    [401, 403],
    async () => {
      await api.functional.communityPlatform.platformAdmin.memberUsers.index(
        unauthenticatedConnection,
        {
          body: {
            page: 1,
            limit: 5,
          } satisfies ICommunityPlatformMemberuser.IRequest,
        },
      );
    },
  );
}
