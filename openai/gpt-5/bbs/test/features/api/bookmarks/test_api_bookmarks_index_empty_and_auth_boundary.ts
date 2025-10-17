import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconDiscussMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussMember";
import type { IEconDiscussPostBookmark } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussPostBookmark";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEconDiscussPostBookmark } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconDiscussPostBookmark";

/**
 * Verify auth boundary and empty bookmarks for a new member.
 *
 * This test ensures that the bookmarks listing endpoint enforces authentication
 * and that a freshly registered member (with no actions taken) receives an
 * empty paginated collection.
 *
 * Steps
 *
 * 1. Call GET /econDiscuss/member/me/bookmarks without Authorization → expect 401
 * 2. Join as a new member (POST /auth/member/join) → SDK sets Authorization
 * 3. Call GET /econDiscuss/member/me/bookmarks with Authorization → expect 200,
 *    valid page object with empty data and zero records/pages
 */
export async function test_api_bookmarks_index_empty_and_auth_boundary(
  connection: api.IConnection,
) {
  // 1) Unauthenticated access should be rejected
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.httpError(
    "unauthenticated bookmarks listing should return 401",
    401,
    async () => {
      return await api.functional.econDiscuss.member.me.bookmarks.index(
        unauthConn,
      );
    },
  );

  // 2) Join as a new member to acquire Authorization via SDK
  const email: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const auth = await api.functional.auth.member.join(connection, {
    body: {
      email,
      password: RandomGenerator.alphaNumeric(12), // >= 8 chars
      display_name: RandomGenerator.name(1), // at least 1 char, <= 120 by generator nature
      timezone: "Asia/Seoul",
      locale: "en-US",
    } satisfies IEconDiscussMember.ICreate,
  });
  typia.assert(auth);

  // 3) Authenticated bookmarks listing should succeed and be empty for new user
  const page =
    await api.functional.econDiscuss.member.me.bookmarks.index(connection);
  typia.assert(page);

  // Business validations (beyond typia structural checks)
  TestValidator.equals(
    "new member should have zero bookmarks (empty data array)",
    page.data.length,
    0,
  );
  TestValidator.equals(
    "pagination.records should be 0 for a brand-new member",
    page.pagination.records,
    0,
  );
  const expectedPages =
    page.pagination.records === 0
      ? 0
      : Math.ceil(page.pagination.records / Math.max(page.pagination.limit, 1));
  TestValidator.equals(
    "pagination.pages should match ceil(records/limit) (0 when records is 0)",
    page.pagination.pages,
    expectedPages,
  );
  await TestValidator.predicate(
    "pagination.current must be >= 0",
    async () => page.pagination.current >= 0,
  );
  await TestValidator.predicate(
    "pagination.limit must be >= 0",
    async () => page.pagination.limit >= 0,
  );
}
