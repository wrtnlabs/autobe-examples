import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEEconDiscussBookmarkSortBy } from "@ORGANIZATION/PROJECT-api/lib/structures/IEEconDiscussBookmarkSortBy";
import type { IESortOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IESortOrder";
import type { IEconDiscussMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussMember";
import type { IEconDiscussPostBookmark } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussPostBookmark";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEconDiscussPostBookmark } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconDiscussPostBookmark";

/**
 * Authentication boundary for member bookmark search.
 *
 * Verifies that the protected endpoint PATCH /econDiscuss/member/me/bookmarks:
 *
 * 1. Rejects unauthenticated access with 401 Unauthorized.
 * 2. Allows access after registering (join) and returns a valid paginated
 *    structure for the current member's bookmarks.
 *
 * Steps
 *
 * 1. Create an unauthenticated connection and attempt a search → expect 401.
 * 2. Register a Member via /auth/member/join to obtain tokens (SDK sets headers).
 * 3. Call /econDiscuss/member/me/bookmarks again with typical pagination/sorting.
 * 4. Validate response types using typia.assert (timestamps validated as ISO
 *    8601).
 */
export async function test_api_bookmarks_authentication_boundary_unauthorized(
  connection: api.IConnection,
) {
  // 1) Unauthenticated access must be rejected with 401 Unauthorized
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.httpError(
    "unauthenticated bookmarks search returns 401",
    401,
    async () => {
      await api.functional.econDiscuss.member.me.bookmarks.search(unauthConn, {
        body: {} satisfies IEconDiscussPostBookmark.IRequest,
      });
    },
  );

  // 2) Register a new member to obtain a valid session (SDK sets Authorization header)
  const joinOutput = await api.functional.auth.member.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "pa55word123", // >= 8 chars
      display_name: RandomGenerator.name(2),
      timezone: "Asia/Seoul",
      locale: "en-US",
      avatar_uri: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEconDiscussMember.ICreate,
  });
  typia.assert(joinOutput);

  // 3) Authenticated access should succeed and return a paginated container
  const page = await api.functional.econDiscuss.member.me.bookmarks.search(
    connection,
    {
      body: {
        page: 1,
        pageSize: 10,
        sortBy: "createdAt",
        sortOrder: "desc",
      } satisfies IEconDiscussPostBookmark.IRequest,
    },
  );

  // 4) Validate response type and embedded timestamp formats
  typia.assert(page);
}
